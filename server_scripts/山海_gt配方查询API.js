// priority: 50
// ========== 山海私货 · GT配方查询API (独立文件) ==========
// 版本: v1.0.0
// 描述: 运行时查询GTCEu已注册配方信息，支持按配方类型、输入/输出物品、EU/t、时长搜索
// 作者: 山海恒长在/dishanhai
// 使用方法: 将此文件放入server_scripts目录，重启服务器即可使用
// 聊天命令: /gt配方列表
//           /gt配方查询 <配方类型>
//           /gt配方搜索 <物品ID>
// =====================================================
//IIFE已就绪...
(function() {

// =====================================================
// =============== 日志模块 ==============================
// =====================================================

var LOG_PREFIX = '§5[GT配方查询]§r';
var LOG_LEVEL = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
var currentLogLevel = LOG_LEVEL.INFO;

function getTimestamp() {
    var now = new Date();
    var hours = now.getHours().toString().padStart(2,'0');
    var minutes = now.getMinutes().toString().padStart(2,'0');
    var seconds = now.getSeconds().toString().padStart(2,'0');
    return '§7[' + hours + ':' + minutes + ':' + seconds + ']§r';
}

function log(level, message) {
    if (level < currentLogLevel) return;
    var color = '§f', name = '[UNKNOWN]';
    if (level === LOG_LEVEL.DEBUG) { color='§8'; name='[DEBUG]'; }
    if (level === LOG_LEVEL.INFO)  { color='§a'; name='[INFO]'; }
    if (level === LOG_LEVEL.WARN)  { color='§e'; name='[WARN]'; }
    if (level === LOG_LEVEL.ERROR) { color='§c'; name='[ERROR]'; }

    console.log(getTimestamp() + ' ' + color + name + '§r ' + LOG_PREFIX + ' ' + message);
}

function debug(m) { return log(LOG_LEVEL.DEBUG, m); }
function info(m)  { return log(LOG_LEVEL.INFO, m); }
function warn(m)  { return log(LOG_LEVEL.WARN, m); }
function error(m) { return log(LOG_LEVEL.ERROR, m); }

// =====================================================
// =============== Java类加载 ============================
// =====================================================

var $GTRecipeType = null;
var $GTRecipeTypes = null;
var $GTRecipe = null;
var $RecipeHelper = null;
var javaLoaded = false;

function loadJavaClasses() {
    if (javaLoaded) return true;
    try {
        $GTRecipeType = Java.loadClass('com.gregtechceu.gtceu.api.recipe.GTRecipeType');
        $GTRecipeTypes = Java.loadClass('com.gregtechceu.gtceu.common.data.GTRecipeTypes');
        $GTRecipe = Java.loadClass('com.gregtechceu.gtceu.api.recipe.GTRecipe');
        $RecipeHelper = Java.loadClass('com.gregtechceu.gtceu.api.recipe.RecipeHelper');
        javaLoaded = true;
        info('Java类加载完成');
        return true;
    } catch(e) {
        error('Java类加载失败: ' + e);
        return false;
    }
}

// =====================================================
// =============== 内部状态 ==============================
// =====================================================

var recipeTypeMap = {};
var recipeCache = {};
var cacheBuilt = false;
var cacheBuilding = false;
var totalRecipeCount = 0;
var buildError = null;

// =====================================================
// =============== 工具函数 ==============================
// =====================================================

function safeToString(obj) {
    if (obj == null) return 'null';
    try { return obj.toString(); } catch(e) { return '' + obj; }
}

function tryInvokeMethod(obj, methodNames) {
    if (obj == null) return null;
    for (var i = 0; i < methodNames.length; i++) {
        try {
            var fn = obj[methodNames[i]];
            if (typeof fn === 'function') {
                var result = fn.call(obj);
                if (result != null) return result;
            }
        } catch(e) {}
    }
    return null;
}

function tryGetInt(obj, methodNames) {
    if (obj == null) return 0;
    for (var i = 0; i < methodNames.length; i++) {
        try {
            var fn = obj[methodNames[i]];
            if (typeof fn === 'function') {
                var result = fn.call(obj);
                if (result != null) return result;
            }
        } catch(e) {}
    }
    return 0;
}

function tryGetItemStacks(obj, methodNames) {
    if (obj == null) return [];
    for (var i = 0; i < methodNames.length; i++) {
        try {
            var fn = obj[methodNames[i]];
            if (typeof fn === 'function') {
                var result = fn.call(obj);
                if (result != null) {
                    if (result instanceof Java.type('net.minecraft.world.item.ItemStack')) {
                        return [result];
                    }
                    if (result instanceof java.util.List || result instanceof Array) {
                        var arr = [];
                        if (typeof result.size === 'function') {
                            for (var j = 0; j < result.size(); j++) { arr.push(result.get(j)); }
                        } else {
                            for (var j = 0; j < result.length; j++) { arr.push(result[j]); }
                        }
                        return arr;
                    }
                    if (result.getClass && result.getClass().isArray()) {
                        return Java.from(result);
                    }
                }
            }
        } catch(e) {}
    }
    return [];
}

function tryGetFluidStacks(obj, methodNames) {
    if (obj == null) return [];
    for (var i = 0; i < methodNames.length; i++) {
        try {
            var fn = obj[methodNames[i]];
            if (typeof fn === 'function') {
                var result = fn.call(obj);
                if (result != null) {
                    if (result instanceof java.util.List || result instanceof Array) {
                        var arr = [];
                        if (typeof result.size === 'function') {
                            for (var j = 0; j < result.size(); j++) { arr.push(result.get(j)); }
                        } else {
                            for (var j = 0; j < result.length; j++) { arr.push(result[j]); }
                        }
                        return arr;
                    }
                    if (result.getClass && result.getClass().isArray()) {
                        return Java.from(result);
                    }
                }
            }
        } catch(e) {}
    }
    return [];
}

function formatItemStack(stack) {
    if (stack == null) return '空';
    try {
        var item = stack.getItem();
        var id = item + '';
        var count = stack.getCount();
        var result = count + 'x ' + id;
        try {
            var chance = stack.getChance();
            if (chance != null && chance < 1.0) {
                result = result + ' (' + Math.round(chance * 100) + '%)';
            }
        } catch(e) {}
        return result;
    } catch(e) {
        return safeToString(stack);
    }
}

function formatFluidStack(fluidStack) {
    if (fluidStack == null) return '空';
    try {
        var fluid = fluidStack.getFluid();
        var id = fluid + '';
        var amount = fluidStack.getAmount();
        return amount + 'mb ' + id;
    } catch(e) {
        return safeToString(fluidStack);
    }
}

function sendToPlayer(player, msg) {
    if (player != null && typeof player.tell === 'function') {
        player.tell(Component.literal(msg));
    }
}

// =====================================================
// =============== 配方类型发现（反射 + 降级）============
// =====================================================

// 常见配方类型字段名列表（作为反射失败的降级方案）
var KNOWN_RECIPE_TYPE_FIELDS = [
    'ALLOY_SMELTER_RECIPES', 'ARC_FURNACE_RECIPES', 'ASSEMBLER_RECIPES',
    'ASSEMBLY_LINE_RECIPES', 'AUTOCLAVE_RECIPES', 'BATTERY_CHARGER_RECIPES',
    'BENDER_RECIPES', 'BLAST_FURNACE_RECIPES', 'BREWING_RECIPES',
    'CANNER_RECIPES', 'CENTRIFUGE_RECIPES', 'CHEMICAL_BATH_RECIPES',
    'CHEMICAL_RECIPES', 'COKE_OVEN_RECIPES', 'COMPRESSOR_RECIPES',
    'CUTTER_RECIPES', 'DISTILLATION_RECIPES', 'DISTILLERY_RECIPES',
    'ELECTROLYZER_RECIPES', 'ELECTROMAGNETIC_SEPARATOR_RECIPES',
    'EXTRUDER_RECIPES', 'EXTRACTOR_RECIPES', 'FERMENTING_RECIPES',
    'FISHER_RECIPES', 'FLUID_HEATER_RECIPES', 'FLUID_SOLIDIFIER_RECIPES',
    'FORGE_HAMMER_RECIPES', 'FORMING_PRESS_RECIPES', 'FURNACE_RECIPES',
    'GAS_COLLECTOR_RECIPES', 'GREENHOUSE_RECIPES', 'GRINDER_RECIPES',
    'HVAC_RECIPES', 'IMPLOSION_COMPRESSOR_RECIPES', 'LARGE_CHEMICAL_RECIPES',
    'LASER_ENGRAVER_RECIPES', 'LATHE_RECIPES', 'MIXER_RECIPES',
    'ORE_WASHER_RECIPES', 'PACKER_RECIPES', 'PLASMA_GENERATOR_RECIPES',
    'PLASTIC_EXTRUDER_RECIPES', 'POLARIZER_RECIPES', 'PRINTER_RECIPES',
    'PYROLYSE_RECIPES', 'ROCK_BREAKER_RECIPES', 'SCANNER_RECIPES',
    'SCREW_MACHINE_RECIPES', 'SIFTER_RECIPES', 'SLICER_RECIPES',
    'SMELTING_RECIPES', 'SORTER_RECIPES', 'THERMAL_CENTRIFUGE_RECIPES',
    'WIREMILL_RECIPES', 'MASS_FABRICATOR_RECIPES', 'REPLICATOR_RECIPES',
    'FLUID_EXTRACTOR_RECIPES', 'FLUID_CANNER_RECIPES', 'MACERATOR_RECIPES',
    'SAWMILL_RECIPES', 'CRYSTALLIZER_RECIPES', 'BIO_REACTOR_RECIPES',
    'LIGHTNING_ROD_RECIPES', 'DIESEL_GENERATOR_RECIPES',
    'STEAM_TURBINE_RECIPES', 'GAS_TURBINE_RECIPES', 'COMBUSTION_RECIPES',
    'STEAM_BOILER_RECIPES', 'HEAT_EXCHANGER_RECIPES', 'NAQUADAH_REACTOR_RECIPES',
    'FUSION_REACTOR_RECIPES', 'ADVANCED_FUSION_REACTOR_RECIPES',
    'LARGE_STEAM_TURBINE_RECIPES', 'PLASMA_TURBINE_RECIPES',
    'PRIMITIVE_BLAST_FURNACE_RECIPES', 'COKE_OVEN_RECIPES',
    'ALLOY_BLAST_FURNACE_RECIPES', 'CRACKING_RECIPES',
    'UNIVERSAL_CHEMICAL_RECIPES', 'CRYO_DISTILLATION_RECIPES',
    'ADVANCED_DISTILLATION_RECIPES', 'FRACTIONAL_DISTILLATION_RECIPES',
    'CATALYTIC_REFORMER_RECIPES', 'POLYMERIZATION_RECIPES',
    'STELLAR_FORGE_RECIPES', 'RESEARCH_STATION_RECIPES',
    'COMPUTER_RECIPES', 'PRECISE_ASSEMBLER_RECIPES',
    'MEGA_BLAST_FURNACE_RECIPES', 'MEGA_VACUUM_FREEZER_RECIPES',
    'MEGA_DISTILLATION_TOWER_RECIPES', 'MEGA_CHEMICAL_REACTOR_RECIPES',
    'LARGE_MACERATOR_RECIPES', 'LARGE_WASHER_RECIPES',
    'LARGE_THERMAL_CENTRIFUGE_RECIPES', 'LARGE_CUTTER_RECIPES',
    'LARGE_MIXER_RECIPES', 'LARGE_ELECTROLYZER_RECIPES',
    'LARGE_SIFTER_RECIPES', 'LARGE_EXTRUDER_RECIPES',
    'LARGE_BENDER_RECIPES', 'LARGE_COMPRESSOR_RECIPES',
    'LARGE_FORGE_HAMMER_RECIPES', 'LARGE_WIREMILL_RECIPES',
    'LARGE_CHEMICAL_BATH_RECIPES', 'LARGE_ENGRAVER_RECIPES',
    'LARGE_AUTOCLAVE_RECIPES', 'LARGE_ARC_FURNACE_RECIPES',
    'LARGE_ALLOY_SMELTER_RECIPES', 'LARGE_BREWERY_RECIPES',
    'LARGE_FERMENTER_RECIPES', 'LARGE_FLUID_HEATER_RECIPES',
    'LARGE_PRINTER_RECIPES', 'LARGE_POLARIZER_RECIPES',
    'LARGE_LASER_ENGRAVER_RECIPES', 'LARGE_ORE_WASHER_RECIPES',
    'LARGE_ELECTROMAGNETIC_SEPARATOR_RECIPES', 'LARGE_SCREW_MACHINE_RECIPES',
    'LARGE_ROCK_BREAKER_RECIPES', 'LARGE_SCANNER_RECIPES'
];

function discoverRecipeTypes() {
    recipeTypeMap = {};
    if (!javaLoaded && !loadJavaClasses()) {
        error('Java类未加载，无法发现配方类型');
        return {};
    }

    var count = 0;
    var errors = [];

    // ---- 方法1: 反射扫描静态字段 + isInstance 检查 ----
    try {
        var clazz = $GTRecipeTypes.class;
        var fields = clazz.getDeclaredFields();
        debug('GTRecipeTypes 共有 ' + fields.length + ' 个声明字段');

        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            try {
                var modifiers = field.getModifiers();
                if ((modifiers & 8) === 0) continue;

                field.setAccessible(true);
                var value = field.get(null);

                if (value != null && $GTRecipeType.class.isInstance(value)) {
                    var name = field.getName();
                    recipeTypeMap[name] = value;
                    count++;
                }
            } catch(e) {
                errors.push('字段[' + fields[i].getName() + ']: ' + e);
            }
        }
        debug('反射发现 ' + count + ' 个配方类型');
    } catch(e) {
        errors.push('反射扫描失败: ' + e);
        warn('反射扫描配方类型失败，尝试降级方案: ' + e);
    }

    // ---- 方法2: 如果反射结果为空，尝试已知字段名直接访问 ----
    if (count === 0) {
        debug('反射未发现配方类型，尝试已知字段名直访...');
        try {
            for (var k = 0; k < KNOWN_RECIPE_TYPE_FIELDS.length; k++) {
                var fieldName = KNOWN_RECIPE_TYPE_FIELDS[k];
                try {
                    var field = $GTRecipeTypes.class.getDeclaredField(fieldName);
                    field.setAccessible(true);
                    var value = field.get(null);
                    if (value != null && $GTRecipeType.class.isInstance(value)) {
                        if (recipeTypeMap[fieldName] == null) {
                            recipeTypeMap[fieldName] = value;
                            count++;
                        }
                    }
                } catch(e) {
                    // 跳过不存在的字段
                }
            }
            debug('字段名直访发现 ' + count + ' 个配方类型');
        } catch(e) {
            errors.push('字段名直访失败: ' + e);
        }
    }

    if (count > 0) {
        info('发现 ' + count + ' 个GT配方类型');
        if (errors.length > 0) {
            debug('发现过程中有 ' + errors.length + ' 个非致命错误');
        }
    } else {
        warn('未能发现任何GT配方类型！请检查GTCEu是否已正确加载');
        if (errors.length > 0) {
            for (var e = 0; e < errors.length && e < 5; e++) {
                debug('错误 ' + (e + 1) + ': ' + errors[e]);
            }
        }
    }

    return recipeTypeMap;
}

// =====================================================
// =============== 配方信息提取 ==========================
// =====================================================

function extractRecipeInfo(recipe, typeName) {
    if (recipe == null) return null;

    var info = {
        type: typeName || '未知',
        id: null,
        eut: 0,
        duration: 0,
        inputs: [],
        outputs: [],
        fluidInputs: [],
        fluidOutputs: [],
        raw: recipe
    };

    try {
        try {
            var rid = recipe.getId();
            if (rid != null) info.id = rid + '';
        } catch(e) {}

        info.eut = tryGetInt(recipe, ['getEUt', 'EUt', 'getEut', 'euT', 'getEuT']);
        if (info.eut == null) info.eut = 0;

        info.duration = tryGetInt(recipe, ['getDuration', 'duration', 'Duration']);
        if (info.duration == null) info.duration = 0;

        var inputStacks = tryGetItemStacks(recipe, [
            'getInputItems', 'getAllItemInputs', 'getItemInputs', 'getInputs',
            'getInputContents', 'getInputIngredientStacks'
        ]);
        for (var i = 0; i < inputStacks.length; i++) {
            var stack = inputStacks[i];
            if (stack != null) {
                try {
                    if (stack instanceof Java.type('net.minecraft.world.item.ItemStack')) {
                        info.inputs.push(formatItemStack(stack));
                    } else if (stack.getItems) {
                        var items = stack.getItems();
                        if (items && items.length > 0) {
                            info.inputs.push(formatItemStack(items[0]));
                        }
                    } else if (stack.getItem) {
                        info.inputs.push(formatItemStack(stack));
                    } else {
                        info.inputs.push(safeToString(stack));
                    }
                } catch(e) {
                    info.inputs.push(safeToString(stack));
                }
            }
        }

        var outputStacks = tryGetItemStacks(recipe, [
            'getOutputItems', 'getAllItemOutputs', 'getItemOutputs', 'getOutputs',
            'getResultItem', 'getOutputContents', 'getOutputIngredientStacks'
        ]);
        for (var i = 0; i < outputStacks.length; i++) {
            var stack = outputStacks[i];
            if (stack != null) {
                try {
                    if (stack instanceof Java.type('net.minecraft.world.item.ItemStack')) {
                        info.outputs.push(formatItemStack(stack));
                    } else if (stack.getItems) {
                        var items = stack.getItems();
                        if (items && items.length > 0) {
                            info.outputs.push(formatItemStack(items[0]));
                        }
                    } else if (stack.getItem) {
                        info.outputs.push(formatItemStack(stack));
                    } else {
                        info.outputs.push(safeToString(stack));
                    }
                } catch(e) {
                    info.outputs.push(safeToString(stack));
                }
            }
        }

        var fluidInputs = tryGetFluidStacks(recipe, [
            'getInputFluids', 'getAllFluidInputs', 'getFluidInputs',
            'getInputFluidStacks', 'getFluidIngredients'
        ]);
        for (var i = 0; i < fluidInputs.length; i++) {
            var fs = fluidInputs[i];
            if (fs != null) {
                info.fluidInputs.push(formatFluidStack(fs));
            }
        }

        var fluidOutputs = tryGetFluidStacks(recipe, [
            'getOutputFluids', 'getAllFluidOutputs', 'getFluidOutputs',
            'getOutputFluidStacks', 'getFluidResults'
        ]);
        for (var i = 0; i < fluidOutputs.length; i++) {
            var fs = fluidOutputs[i];
            if (fs != null) {
                info.fluidOutputs.push(formatFluidStack(fs));
            }
        }
    } catch(e) {
        debug('提取配方信息时出错: ' + e);
    }

    return info;
}

// =====================================================
// =============== 缓存构建 ==============================
// =====================================================

function buildCache() {
    if (cacheBuilt) return true;
    if (cacheBuilding) {
        warn('缓存正在构建中，请稍候');
        return false;
    }

    cacheBuilding = true;
    buildError = null;
    recipeCache = {};
    totalRecipeCount = 0;

    if (!javaLoaded && !loadJavaClasses()) {
        buildError = 'Java类未加载';
        cacheBuilding = false;
        return false;
    }

    var typeKeys = Object.keys(recipeTypeMap);
    if (typeKeys.length === 0) {
        discoverRecipeTypes();
        typeKeys = Object.keys(recipeTypeMap);
    }

    if (typeKeys.length === 0) {
        buildError = '未发现任何配方类型';
        cacheBuilding = false;
        return false;
    }

    info('开始构建配方缓存，发现 ' + typeKeys.length + ' 个配方类型...');

    for (var t = 0; t < typeKeys.length; t++) {
        var typeName = typeKeys[t];
        var recipeType = recipeTypeMap[typeName];
        if (recipeType == null) continue;

        var recipes = [];
        var recipeList = null;

        recipeList = tryInvokeMethod(recipeType, [
            'getRecipeList', 'getRecipes', 'getAllRecipes', 'getRecipeMap'
        ]);

        if (recipeList != null) {
            var recipeMapName = recipeList.getClass().getName() + '';
            if (recipeMapName.indexOf('RecipeMap') >= 0) {
                recipeList = tryInvokeMethod(recipeList, [
                    'getRecipeList', 'getRecipes', 'getAllRecipes'
                ]);
            }
        }

        if (recipeList == null) {
            try {
                var fields = recipeType.getClass().getDeclaredFields();
                for (var f = 0; f < fields.length; f++) {
                    var field = fields[f];
                    var fName = field.getName().toLowerCase();
                    if (fName.indexOf('recipe') >= 0 || fName.indexOf('map') >= 0 || fName.indexOf('list') >= 0) {
                        field.setAccessible(true);
                        var val = field.get(recipeType);
                        if (val != null) {
                            var valClass = val.getClass().getName() + '';
                            if (val instanceof java.util.List) {
                                recipeList = val;
                                break;
                            } else if (valClass.indexOf('RecipeMap') >= 0) {
                                var subList = tryInvokeMethod(val, [
                                    'getRecipeList', 'getRecipes', 'getAllRecipes'
                                ]);
                                if (subList != null) {
                                    recipeList = subList;
                                    break;
                                }
                            }
                        }
                    }
                }
            } catch(e) {
                debug('反射获取 ' + typeName + ' 配方字段失败: ' + e);
            }
        }

        if (recipeList != null) {
            try {
                var size = 0;
                if (typeof recipeList.size === 'function') {
                    size = recipeList.size();
                } else if (recipeList.length !== undefined) {
                    size = recipeList.length;
                }

                for (var r = 0; r < size; r++) {
                    var recipe = null;
                    try {
                        if (typeof recipeList.get === 'function') {
                            recipe = recipeList.get(r);
                        } else {
                            recipe = recipeList[r];
                        }
                    } catch(e) {
                        continue;
                    }

                    if (recipe == null) continue;

                    var info = extractRecipeInfo(recipe, typeName);
                    if (info != null) {
                        recipes.push(info);
                    }
                }
            } catch(e) {
                warn('处理 ' + typeName + ' 配方列表时出错: ' + e);
            }
        }

        recipeCache[typeName] = recipes;
        totalRecipeCount += recipes.length;
        debug(typeName + ': ' + recipes.length + ' 个配方');
    }

    cacheBuilt = true;
    cacheBuilding = false;
    info('配方缓存构建完成，共 ' + totalRecipeCount + ' 个配方，分布在 ' + typeKeys.length + ' 个类型中');
    return true;
}

// =====================================================
// =============== 查询方法 ==============================
// =====================================================

function getRecipeTypes() {
    if (!cacheBuilt) buildCache();
    var typeKeys = Object.keys(recipeTypeMap);
    if (typeKeys.length === 0) discoverRecipeTypes();
    return Object.keys(recipeTypeMap);
}

function getRecipesByType(typeName) {
    if (!cacheBuilt) buildCache();
    var key = typeName.toUpperCase();
    if (recipeCache[key]) return recipeCache[key];

    var typeKeys = Object.keys(recipeCache);
    for (var i = 0; i < typeKeys.length; i++) {
        var tk = typeKeys[i].toUpperCase();
        if (tk === key || tk.indexOf(key) >= 0 || key.indexOf(tk) >= 0) {
            return recipeCache[typeKeys[i]];
        }
    }
    return [];
}

function findRecipesByInput(itemId) {
    if (!cacheBuilt) buildCache();
    var results = [];
    var searchId = itemId.toLowerCase();

    var typeKeys = Object.keys(recipeCache);
    for (var t = 0; t < typeKeys.length; t++) {
        var recipes = recipeCache[typeKeys[t]];
        for (var r = 0; r < recipes.length; r++) {
            var recipe = recipes[r];
            for (var i = 0; i < recipe.inputs.length; i++) {
                if (recipe.inputs[i].toLowerCase().indexOf(searchId) >= 0) {
                    results.push(recipe);
                    i = recipe.inputs.length;
                }
            }
            if (searchId.length > 0) {
                for (var i = 0; i < recipe.fluidInputs.length; i++) {
                    if (recipe.fluidInputs[i].toLowerCase().indexOf(searchId) >= 0) {
                        results.push(recipe);
                        break;
                    }
                }
            }
        }
    }
    return results;
}

function findRecipesByOutput(itemId) {
    if (!cacheBuilt) buildCache();
    var results = [];
    var searchId = itemId.toLowerCase();

    var typeKeys = Object.keys(recipeCache);
    for (var t = 0; t < typeKeys.length; t++) {
        var recipes = recipeCache[typeKeys[t]];
        for (var r = 0; r < recipes.length; r++) {
            var recipe = recipes[r];
            var matched = false;
            for (var i = 0; i < recipe.outputs.length; i++) {
                if (recipe.outputs[i].toLowerCase().indexOf(searchId) >= 0) {
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                for (var i = 0; i < recipe.fluidOutputs.length; i++) {
                    if (recipe.fluidOutputs[i].toLowerCase().indexOf(searchId) >= 0) {
                        matched = true;
                        break;
                    }
                }
            }
            if (matched) results.push(recipe);
        }
    }
    return results;
}

function searchRecipes(options) {
    if (!cacheBuilt) buildCache();
    var results = [];
    var typeKeys = Object.keys(recipeCache);
    var limit = options.limit || 100;

    for (var t = 0; t < typeKeys.length; t++) {
        var typeName = typeKeys[t];

        if (options.type) {
            var searchType = options.type.toUpperCase();
            if (typeName.toUpperCase().indexOf(searchType) < 0 && searchType.indexOf(typeName.toUpperCase()) < 0) {
                continue;
            }
        }

        var recipes = recipeCache[typeName];
        for (var r = 0; r < recipes.length; r++) {
            if (results.length >= limit) break;

            var recipe = recipes[r];
            var match = true;

            if (options.input && match) {
                var found = false;
                var si = options.input.toLowerCase();
                for (var i = 0; i < recipe.inputs.length; i++) {
                    if (recipe.inputs[i].toLowerCase().indexOf(si) >= 0) { found = true; break; }
                }
                match = found;
            }

            if (options.output && match) {
                var found = false;
                var so = options.output.toLowerCase();
                for (var i = 0; i < recipe.outputs.length; i++) {
                    if (recipe.outputs[i].toLowerCase().indexOf(so) >= 0) { found = true; break; }
                }
                match = found;
            }

            if (options.fluidInput && match) {
                var found = false;
                var sfi = options.fluidInput.toLowerCase();
                for (var i = 0; i < recipe.fluidInputs.length; i++) {
                    if (recipe.fluidInputs[i].toLowerCase().indexOf(sfi) >= 0) { found = true; break; }
                }
                match = found;
            }

            if (options.fluidOutput && match) {
                var found = false;
                var sfo = options.fluidOutput.toLowerCase();
                for (var i = 0; i < recipe.fluidOutputs.length; i++) {
                    if (recipe.fluidOutputs[i].toLowerCase().indexOf(sfo) >= 0) { found = true; break; }
                }
                match = found;
            }

            if (options.minEUt !== undefined && recipe.eut < options.minEUt) match = false;
            if (options.maxEUt !== undefined && recipe.eut > options.maxEUt) match = false;
            if (options.minDuration !== undefined && recipe.duration < options.minDuration) match = false;
            if (options.maxDuration !== undefined && recipe.duration > options.maxDuration) match = false;

            if (match) results.push(recipe);
        }
        if (results.length >= limit) break;
    }

    return results;
}

function getRecipeStats() {
    if (!cacheBuilt) buildCache();
    var stats = {
        totalTypes: 0,
        totalRecipes: totalRecipeCount,
        typeBreakdown: {},
        cacheBuilt: cacheBuilt,
        buildError: buildError
    };

    var typeKeys = Object.keys(recipeCache);
    stats.totalTypes = typeKeys.length;

    for (var i = 0; i < typeKeys.length; i++) {
        stats.typeBreakdown[typeKeys[i]] = recipeCache[typeKeys[i]].length;
    }

    return stats;
}

function getRecipeDetail(typeName, index) {
    if (!cacheBuilt) buildCache();
    var recipes = getRecipesByType(typeName);
    if (index === undefined) return recipes;
    if (index >= 0 && index < recipes.length) {
        return recipes[index];
    }
    return null;
}

function reloadCache() {
    cacheBuilt = false;
    cacheBuilding = false;
    totalRecipeCount = 0;
    buildError = null;
    discoverRecipeTypes();
    return buildCache();
}

function getCacheStatus() {
    return {
        built: cacheBuilt,
        building: cacheBuilding,
        typeCount: Object.keys(recipeCache).length,
        recipeCount: totalRecipeCount,
        error: buildError
    };
}

function formatRecipeForChat(recipeInfo) {
    if (recipeInfo == null) return '§c无配方信息';
    var lines = [];
    lines.push('§6===== GT配方信息 =====');
    lines.push('§e类型: §f' + (recipeInfo.type || '未知'));
    lines.push('§eID: §f' + (recipeInfo.id || '无'));
    lines.push('§eEU/t: §f' + recipeInfo.eut);
    lines.push('§e时长: §f' + recipeInfo.duration + 't (' + (recipeInfo.duration / 20) + 's)');

    if (recipeInfo.inputs && recipeInfo.inputs.length > 0) {
        lines.push('§e输入物品:');
        for (var i = 0; i < recipeInfo.inputs.length; i++) {
            lines.push('  §7- ' + recipeInfo.inputs[i]);
        }
    }
    if (recipeInfo.fluidInputs && recipeInfo.fluidInputs.length > 0) {
        lines.push('§e输入流体:');
        for (var i = 0; i < recipeInfo.fluidInputs.length; i++) {
            lines.push('  §b- ' + recipeInfo.fluidInputs[i]);
        }
    }
    if (recipeInfo.outputs && recipeInfo.outputs.length > 0) {
        lines.push('§e输出物品:');
        for (var i = 0; i < recipeInfo.outputs.length; i++) {
            lines.push('  §a- ' + recipeInfo.outputs[i]);
        }
    }
    if (recipeInfo.fluidOutputs && recipeInfo.fluidOutputs.length > 0) {
        lines.push('§e输出流体:');
        for (var i = 0; i < recipeInfo.fluidOutputs.length; i++) {
            lines.push('  §d- ' + recipeInfo.fluidOutputs[i]);
        }
    }
    return lines.join('\n');
}

// =====================================================
// =============== 初始化 ===============================
// =====================================================

function init() {
    info('GT配方查询API 初始化中...');
    if (loadJavaClasses()) {
        discoverRecipeTypes();
        info('GT配方查询API 初始化完成，发现 ' + Object.keys(recipeTypeMap).length + ' 个配方类型');
    } else {
        warn('GT配方查询API 初始化失败 - 无法加载Java类');
    }
}

// =====================================================
// =============== 聊天命令注册 ===========================
// =====================================================

ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands;
    var Arguments = event.arguments;

    event.register(
        Commands.literal('gt配方列表')
            .requires(function(source) {
                return source.hasPermission(2);
            })
            .executes(function(ctx) {
                var source = ctx.source;
                var player = source.getEntity ? source.getEntity() : null;

                if (!cacheBuilt) buildCache();
                var stats = getRecipeStats();

                var msg = '§6===== GT配方类型列表 =====\n';
                msg = msg + '§e共 ' + stats.totalTypes + ' 个配方类型, ' + stats.totalRecipes + ' 个配方\n';
                var types = Object.keys(stats.typeBreakdown);
                for (var i = 0; i < types.length; i++) {
                    msg = msg + '§7- §f' + types[i] + ' §7(' + stats.typeBreakdown[types[i]] + ')\n';
                }

                if (player) {
                    sendToPlayer(player, msg);
                } else {
                    console.log('[GT配方列表] ' + stats.totalTypes + ' 个类型, ' + stats.totalRecipes + ' 个配方');
                }
                return 1;
            })
    );

    event.register(
        Commands.literal('gt配方查询')
            .requires(function(source) {
                return source.hasPermission(2);
            })
            .executes(function(ctx) {
                var source = ctx.source;
                var player = source.getEntity ? source.getEntity() : null;
                var helpMsg = '§c用法: /gt配方查询 <配方类型>\n§7示例: /gt配方查询 assembler';
                if (player) {
                    sendToPlayer(player, helpMsg);
                }
                return 1;
            })
            .then(Commands.argument('typeName', Arguments.GREEDY_STRING.create(event))
                .executes(function(ctx) {
                    var source = ctx.source;
                    var player = source.getEntity ? source.getEntity() : null;
                    var typeName = Arguments.GREEDY_STRING.getResult(ctx, 'typeName') + '';

                    if (!cacheBuilt) buildCache();
                    var recipes = getRecipesByType(typeName);

                    if (player) {
                        sendToPlayer(player, '§6类型: §f' + typeName + ' §7(' + recipes.length + ' 个配方)');

                        var displayCount = Math.min(recipes.length, 30);
                        for (var i = 0; i < displayCount; i++) {
                            var r = recipes[i];
                            var id = r.id ? r.id : '#' + i;
                            var line = '§7' + (i + 1) + '. §f' + id + ' §7| §e' + r.eut + 'EU/t §7| §a' + r.duration + 't';
                            if (r.outputs.length > 0) {
                                line = line + ' §7→ §b' + r.outputs[0];
                            }
                            sendToPlayer(player, line);
                        }
                        if (recipes.length > displayCount) {
                            sendToPlayer(player, '§e... 还有 ' + (recipes.length - displayCount) + ' 个配方未显示');
                        }
                    } else {
                        console.log('[GT配方查询] ' + typeName + ': ' + recipes.length + ' 个配方');
                    }
                    return 1;
                })
            )
    );

    event.register(
        Commands.literal('gt配方搜索')
            .requires(function(source) {
                return source.hasPermission(2);
            })
            .executes(function(ctx) {
                var source = ctx.source;
                var player = source.getEntity ? source.getEntity() : null;
                var helpMsg = '§c用法: /gt配方搜索 <物品ID>\n§7示例: /gt配方搜索 gtceu:iron_ingot';
                if (player) {
                    sendToPlayer(player, helpMsg);
                }
                return 1;
            })
            .then(Commands.argument('itemId', Arguments.GREEDY_STRING.create(event))
                .executes(function(ctx) {
                    var source = ctx.source;
                    var player = source.getEntity ? source.getEntity() : null;
                    var itemId = Arguments.GREEDY_STRING.getResult(ctx, 'itemId') + '';

                    if (!cacheBuilt) buildCache();
                    var byInput = findRecipesByInput(itemId);
                    var byOutput = findRecipesByOutput(itemId);

                    if (player) {
                        sendToPlayer(player, '§6===== 搜索: §f' + itemId + ' §6=====');
                        sendToPlayer(player, '§e作为输入: §f' + byInput.length + ' 个配方');
                        sendToPlayer(player, '§e作为输出: §f' + byOutput.length + ' 个配方');

                        if (byOutput.length > 0) {
                            sendToPlayer(player, '§a--- 输出配方（前10个） ---');
                            var dc = Math.min(byOutput.length, 10);
                            for (var i = 0; i < dc; i++) {
                                var r = byOutput[i];
                                var line = '§7' + (i + 1) + '. §f[' + r.type + '] §e' + r.eut + 'EU/t §a' + r.duration + 't';
                                sendToPlayer(player, line);
                            }
                        }
                    } else {
                        console.log('[GT配方搜索] ' + itemId + ': 输入=' + byInput.length + ', 输出=' + byOutput.length);
                    }
                    return 1;
                })
            )
    );
});

// =====================================================
// =============== 全局API导出 ===========================
// =====================================================

global.shanhaiGTRecipeQueryAPI = {
    // 核心查询方法
    getRecipeTypes: getRecipeTypes,
    getRecipesByType: getRecipesByType,
    findRecipesByInput: findRecipesByInput,
    findRecipesByOutput: findRecipesByOutput,
    searchRecipes: searchRecipes,
    getRecipeDetail: getRecipeDetail,
    getRecipeStats: getRecipeStats,

    // 缓存管理
    reloadCache: reloadCache,
    getCacheStatus: getCacheStatus,

    // 格式化工具
    formatRecipeForChat: formatRecipeForChat,

    // 版本信息
    version: '1.0.0'
};

// =====================================================
// =============== 集成到山海配方API =====================
// =====================================================
// 将GT配方查询功能注册到 global.shanhaiRecipeAPI.gtRecipes
// 外部脚本可通过以下路径调用：
//   global.shanhaiRecipeAPI.gtRecipes.findRecipesByInput('minecraft:diamond')
//   或保持原有的 global.shanhaiGTRecipeQueryAPI.findRecipesByInput(...)

if (global.shanhaiRecipeAPI && typeof global.shanhaiRecipeAPI === 'object') {
    global.shanhaiRecipeAPI.gtRecipes = {
        getRecipeTypes: getRecipeTypes,
        getRecipesByType: getRecipesByType,
        findRecipesByInput: findRecipesByInput,
        findRecipesByOutput: findRecipesByOutput,
        searchRecipes: searchRecipes,
        getRecipeDetail: getRecipeDetail,
        getRecipeStats: getRecipeStats,
        reloadCache: reloadCache,
        getCacheStatus: getCacheStatus,
        formatRecipeForChat: formatRecipeForChat,
        version: '1.0.0'
    };
    info('GT配方查询API 已集成到 shanhaiRecipeAPI.gtRecipes');
} else {
    warn('GT配方查询API: 未找到 shanhaiRecipeAPI，保持独立 API');
}

// ========== 初始化 ==========
init();

})();
