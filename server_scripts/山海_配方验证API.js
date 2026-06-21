// priority: 15
// ========== 山海私货 · 配方验证API (独立文件) ==========
// 版本: v1.0.0
// 描述: 提供全面的配方验证、冲突检测和平衡性分析功能
// 作者: 山海恒长在/dishanhai
// 使用方法: 将此文件放入server_scripts目录，重启服务器即可使用
// 聊天命令: /配方验证 <配方ID>
//           /配方验证全部
//           /配方验证报告
//           /配方冲突检测
//           /配方平衡分析
// =====================================================

// ========== 重要提示 ==========
// 此API提供专业的配方验证功能，帮助开发者确保配方质量和平衡性。
// 验证结果仅供参考，最终决策需结合实际情况。
// ==============================
//IIFE已就绪...
(function() {

// =====================================================
// =============== 日志模块 ==================
// =====================================================

var LOG_PREFIX = '§d[配方验证API]§r';
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
// =============== 工具函数模块 ==================
// =====================================================

/**
 * 从全局变量中获取gtr对象
 * 尝试多种可能的全局变量位置
 */
function getGtrObject() {
    // 尝试从多个可能的全局位置获取gtr对象
    var possibleGtrSources = [
        global.gtr,
        (typeof global !== 'undefined' && global.gtr) ? global.gtr : null,
        (typeof gtr !== 'undefined') ? gtr : null,
        (typeof event !== 'undefined' && event.recipes && event.recipes.gtceu) ? event.recipes.gtceu : null
    ];
    
    for (var i = 0; i < possibleGtrSources.length; i++) {
        if (possibleGtrSources[i]) {
            debug('从源 ' + i + ' 获取到gtr对象');
            return possibleGtrSources[i];
        }
    }
    
    warn('无法获取gtr对象，部分验证功能可能受限');
    return null;
}

/**
 * 获取配方数组列表
 * 从全局变量中查找所有可能的配方数组
 */
function getAllRecipeArrays() {
    var arrays = [];
    var arrayNames = [
        // 主配方数组
        'assrecipes', 'universalRecipes', 'suprecipes_1', 
        'recipes_voidfluxs', 'dishanhairecipes', 'recipes', 
        'recipes_electrolyzers',
        // 测试配方数组
        'recipeTestArray', 'testRecipes', 'mockRecipes', 'test_recipe_array',
        'testRecipesArray', 'mockRecipeArray'
    ];
    
    // 首先添加精确匹配的数组
    for (var i = 0; i < arrayNames.length; i++) {
        var arr = global[arrayNames[i]];
        if (arr && Array.isArray(arr)) {
            arrays.push({
                name: arrayNames[i],
                array: arr
            });
        }
    }
    
    // 然后搜索所有全局变量，查找可能包含配方的数组
    // （以'recipe'、'recipes'、'配方'等关键词结尾的变量）
    var recipeKeywords = ['recipe', 'recipes', '配方', 'ass', 'universal', 'sup'];
    for (var key in global) {
        if (global.hasOwnProperty(key)) {
            var value = global[key];
            if (Array.isArray(value) && value.length > 0) {
                // 检查数组第一个元素是否有类似配方的结构
                var firstItem = value[0];
                if (firstItem && typeof firstItem === 'object' && 
                    firstItem.id !== undefined && firstItem.type !== undefined) {
                    // 这看起来像是一个配方数组
                    arrays.push({
                        name: key,
                        array: value
                    });
                }
            }
        }
    }
    
    return arrays;
}

/**
 * 规范化配方ID，用于模糊匹配
 * 移除所有空格、下划线、连字符，转换为小写
 */
function normalizeRecipeId(id) {
    if (id === null || id === undefined) return '';
    try {
        // 支持Java字符串对象
        var strId = String(id);
        return strId.toLowerCase()
            .replace(/\s+/g, '')     // 移除所有空格
            .replace(/_/g, '')       // 移除下划线
            .replace(/-/g, '')       // 移除连字符
            .replace(/:/g, '')       // 移除冒号（命名空间分隔符）
            .replace(/'/g, '')       // 移除单引号
            .replace(/"/g, '')       // 移除双引号
            .trim();
    } catch (err) {
        debug('normalizeRecipeId: 无法将id转换为字符串 - ' + err.message);
        return '';
    }
}

/**
 * 在所有配方数组中查找指定ID的配方
 * 支持多种ID格式：原样匹配、小写匹配、移除空格和下划线后匹配
 */
function findRecipeById(id) {
    if (id === null || id === undefined) {
        debug('findRecipeById: 输入id为null或undefined');
        return null;
    }
    
    try {
        id = String(id);
    } catch (err) {
        debug('findRecipeById: 无法将id转换为字符串 - ' + err.message);
        return null;
    }
    
    if (!id.trim()) {
        debug('findRecipeById: id为空字符串');
        return null;
    }
    
    debug('findRecipeById: 查找配方ID="' + id + '"');
    
    var arrays = getAllRecipeArrays();
    var normalizedId = normalizeRecipeId(id);
    
    for (var i = 0; i < arrays.length; i++) {
        var arr = arrays[i].array;
        if (!arr) continue;
        
        for (var j = 0; j < arr.length; j++) {
            var recipe = arr[j];
            if (!recipe || !recipe.id) continue;
            
            // 1. 精确匹配
            if (recipe.id === id) {
                debug('findRecipeById: 精确匹配找到配方 "' + id + '" 位于 ' + arrays[i].name + '[' + j + ']');
                return {
                    recipe: recipe,
                    arrayName: arrays[i].name,
                    index: j
                };
            }
            
            // 2. 小写匹配
            if (recipe.id.toLowerCase() === id.toLowerCase()) {
                debug('findRecipeById: 小写匹配找到配方 "' + id + '" 位于 ' + arrays[i].name + '[' + j + ']');
                return {
                    recipe: recipe,
                    arrayName: arrays[i].name,
                    index: j
                };
            }
            
            // 3. 规范化匹配（移除空格、下划线、连字符等）
            var recipeNormalizedId = normalizeRecipeId(recipe.id);
            if (recipeNormalizedId === normalizedId) {
                debug('findRecipeById: 规范化匹配找到配方 "' + id + '" 位于 ' + arrays[i].name + '[' + j + ']');
                return {
                    recipe: recipe,
                    arrayName: arrays[i].name,
                    index: j
                };
            }
        }
    }
    
    debug('findRecipeById: 未找到配方ID="' + id + '"');
    return null;
}

/**
 * 获取所有配方的唯一ID列表
 */
function getAllRecipeIds() {
    var ids = [];
    var arrays = getAllRecipeArrays();
    
    for (var i = 0; i < arrays.length; i++) {
        var arr = arrays[i].array;
        if (!arr) continue;
        
        for (var j = 0; j < arr.length; j++) {
            var recipe = arr[j];
            if (recipe && recipe.id) {
                try {
                    var idStr = String(recipe.id);
                    ids.push(idStr);
                } catch (err) {
                    // 忽略转换错误
                }
            }
        }
    }
    
    return ids;
}

// =====================================================
// =============== 基础验证模块 ==================
// =====================================================

/**
 * 验证配方基本结构
 * 检查必需字段和基本类型
 */
function validateBasicStructure(recipe) {
    var result = {
        valid: true,
        errors: [],
        warnings: []
    };
    
    if (!recipe) {
        result.valid = false;
        result.errors.push('配方对象为空');
        debug('validateRecipe: 验证完成，配方ID="' + recipeId + '"，有效=' + result.valid + '，错误=' + errorCount + '，警告=' + warningCount);
    return result;
    }
    
    // 检查必需字段
    if (!recipe.id) {
        result.valid = false;
        result.errors.push('配方ID缺失');
    } else {
        try {
            var idStr = String(recipe.id);
            if (!idStr.trim()) {
                result.valid = false;
                result.errors.push('配方ID为空字符串');
            }
        } catch (err) {
            result.valid = false;
            result.errors.push('配方ID无法转换为字符串，实际类型: ' + typeof recipe.id);
        }
    }
    
    if (!recipe.type) {
        result.valid = false;
        result.errors.push('机器类型缺失');
    } else {
        try {
            var typeStr = String(recipe.type);
            if (!typeStr.trim()) {
                result.valid = false;
                result.errors.push('机器类型为空字符串');
            }
        } catch (err) {
            result.valid = false;
            result.errors.push('机器类型无法转换为字符串，实际类型: ' + typeof recipe.type);
        }
    }
    
    // 检查duration字段（GT机器必需）
    if (recipe.duration == null) {
        result.warnings.push('duration参数缺失（GT机器必需）');
    } else if (typeof recipe.duration !== 'number') {
        result.errors.push('duration必须是数字，实际类型: ' + typeof recipe.duration);
    } else if (recipe.duration <= 0) {
        result.warnings.push('duration值异常: ' + recipe.duration + '（通常应为正数）');
    }
    
    // 检查EUt字段（GT机器必需，除了cosmos_simulation）
    if (recipe.type !== 'cosmos_simulation' && recipe.EUt == null) {
        result.warnings.push('EUt参数缺失（GT机器必需）');
    } else if (recipe.EUt != null && typeof recipe.EUt !== 'number') {
        result.errors.push('EUt必须是数字，实际类型: ' + typeof recipe.EUt);
    } else if (recipe.EUt != null && recipe.EUt < 0) {
        result.warnings.push('EUt值异常: ' + recipe.EUt + '（通常应为正数）');
    }
    
    // 检查机器类型有效性
    var gtr = getGtrObject();
    if (gtr && recipe.type) {
        try {
            var typeStr = String(recipe.type);
            if (!gtr[typeStr]) {
                result.warnings.push('未知机器类型: ' + typeStr + '（在当前的gtr对象中未找到）');
            }
        } catch (err) {
            // 忽略转换错误
        }
    }
    
    return result;
}

// =====================================================
// =============== 语法验证模块 ==================
// =====================================================

/**
 * 验证物品格式
 * 检查物品字符串格式是否正确
 */
function validateItemFormat(itemStr) {
    // 安全转换输入为字符串
    var str;
    try {
        str = String(itemStr);
    } catch (err) {
        return { valid: false, error: '物品格式无法转换为字符串，实际类型: ' + typeof itemStr };
    }
    
    // 常见物品格式：
    // 1. "数量x 物品ID" 如 "4x minecraft:iron_ingot"
    // 2. "物品ID" 如 "minecraft:iron_ingot"（默认1个）
    // 3. "标签#标签名" 如 "#forge:ingots/iron"
    
    var parts = str.trim().split(' ');
    
    if (parts.length === 1) {
        // 只有物品ID
        var itemId = parts[0];
        if (!itemId.includes(':') && !itemId.startsWith('#')) {
            return { valid: false, error: '物品ID格式错误，缺少命名空间: ' + itemId };
        }
    } else if (parts.length >= 2) {
        // 可能有数量前缀
        var firstPart = parts[0];
        if (firstPart.endsWith('x')) {
            var countStr = firstPart.slice(0, -1);
            var count = parseInt(countStr, 10);
            if (isNaN(count) || count <= 0) {
                return { valid: false, error: '物品数量格式错误: ' + firstPart };
            }
            
            // 检查剩余部分是否为有效的物品ID
            var itemId = parts.slice(1).join(' ');
            if (!itemId.includes(':') && !itemId.startsWith('#')) {
                return { valid: false, error: '物品ID格式错误，缺少命名空间: ' + itemId };
            }
        } else {
            // 没有数量前缀，整个字符串应该是物品ID
            var fullId = parts.join(' ');
            if (!fullId.includes(':') && !fullId.startsWith('#')) {
                return { valid: false, error: '物品ID格式错误，缺少命名空间: ' + fullId };
            }
        }
    }
    
    return { valid: true };
}

/**
 * 验证流体格式
 * 检查流体字符串格式是否正确
 */
function validateFluidFormat(fluidStr) {
    // 安全转换输入为字符串
    var str;
    try {
        str = String(fluidStr);
    } catch (err) {
        return { valid: false, error: '流体格式无法转换为字符串，实际类型: ' + typeof fluidStr };
    }
    
    // 常见流体格式：
    // 1. "流体ID 数量" 如 "minecraft:water 1000"
    // 2. "流体ID" 如 "minecraft:water"（可能默认1mb）
    
    var parts = str.trim().split(' ');
    
    if (parts.length === 1) {
        // 只有流体ID
        var fluidId = parts[0];
        if (!fluidId.includes(':')) {
            return { valid: false, error: '流体ID格式错误，缺少命名空间: ' + fluidId };
        }
    } else if (parts.length >= 2) {
        // 有流体ID和数量
        var fluidId = parts.slice(0, -1).join(' ');
        var amountStr = parts[parts.length - 1];
        
        if (!fluidId.includes(':')) {
            return { valid: false, error: '流体ID格式错误，缺少命名空间: ' + fluidId };
        }
        
        var amount = parseInt(amountStr, 10);
        if (isNaN(amount) || amount <= 0) {
            return { valid: false, error: '流体数量格式错误: ' + amountStr };
        }
    }
    
    return { valid: true };
}

/**
 * 验证配方语法
 * 检查物品输入输出、流体输入输出的格式
 */
function validateRecipeSyntax(recipe) {
    var result = {
        valid: true,
        errors: [],
        warnings: []
    };
    
    // 验证物品输入
    if (recipe.itemInputs && Array.isArray(recipe.itemInputs)) {
        for (var i = 0; i < recipe.itemInputs.length; i++) {
            var item = recipe.itemInputs[i];
            var validation = validateItemFormat(item);
            if (!validation.valid) {
                result.errors.push('物品输入[' + i + ']格式错误: ' + validation.error);
            }
        }
    } else if (recipe.itemInputs && !Array.isArray(recipe.itemInputs)) {
        result.errors.push('itemInputs必须是数组，实际类型: ' + typeof recipe.itemInputs);
    }
    
    // 验证物品输出
    if (recipe.itemOutputs && Array.isArray(recipe.itemOutputs)) {
        for (var i = 0; i < recipe.itemOutputs.length; i++) {
            var item = recipe.itemOutputs[i];
            var validation = validateItemFormat(item);
            if (!validation.valid) {
                result.errors.push('物品输出[' + i + ']格式错误: ' + validation.error);
            }
        }
    } else if (recipe.itemOutputs && !Array.isArray(recipe.itemOutputs)) {
        result.errors.push('itemOutputs必须是数组，实际类型: ' + typeof recipe.itemOutputs);
    }
    
    // 验证流体输入
    if (recipe.inputFluids && Array.isArray(recipe.inputFluids)) {
        for (var i = 0; i < recipe.inputFluids.length; i++) {
            var fluid = recipe.inputFluids[i];
            var validation = validateFluidFormat(fluid);
            if (!validation.valid) {
                result.errors.push('流体输入[' + i + ']格式错误: ' + validation.error);
            }
        }
    } else if (recipe.inputFluids && !Array.isArray(recipe.inputFluids)) {
        result.errors.push('inputFluids必须是数组，实际类型: ' + typeof recipe.inputFluids);
    }
    
    // 验证流体输出
    if (recipe.outputFluids && Array.isArray(recipe.outputFluids)) {
        for (var i = 0; i < recipe.outputFluids.length; i++) {
            var fluid = recipe.outputFluids[i];
            var validation = validateFluidFormat(fluid);
            if (!validation.valid) {
                result.errors.push('流体输出[' + i + ']格式错误: ' + validation.error);
            }
        }
    } else if (recipe.outputFluids && !Array.isArray(recipe.outputFluids)) {
        result.errors.push('outputFluids必须是数组，实际类型: ' + typeof recipe.outputFluids);
    }
    
    result.valid = result.errors.length === 0;
    return result;
}

// =====================================================
// =============== 兼容性验证模块 ==================
// =====================================================

/**
 * 获取机器电压等级
 * 根据机器类型确定其支持的电压等级
 */
function getMachineVoltageLevel(machineType) {
    // GT机器电压等级映射
    var voltageMap = {
        // 基础机器
        'macerator': 'LV',
        'ore_washer': 'LV',
        'thermal_centrifuge': 'LV',
        'compressor': 'LV',
        'forge_hammer': 'LV',
        'furnace': 'LV',
        'alloy_smelter': 'LV',
        'arc_furnace': 'LV',
        'assembler': 'LV',
        'autoclave': 'LV',
        'bender': 'LV',
        'brewery': 'LV',
        'canner': 'LV',
        'centrifuge': 'LV',
        'chemical_bath': 'LV',
        'chemical_reactor': 'LV',
        'circuit_assembler': 'LV',
        'cutter': 'LV',
        'distillery': 'LV',
        'electrolyzer': 'LV',
        'electromagnetic_separator': 'LV',
        'extractor': 'LV',
        'extruder': 'LV',
        'fermenter': 'LV',
        'fluid_heater': 'LV',
        'fluid_solidifier': 'LV',
        'forge_hammer': 'LV',
        'forming_press': 'LV',
        'lathe': 'LV',
        'mixer': 'LV',
        'ore_washer': 'LV',
        'packer': 'LV',
        'polarizer': 'LV',
        'precision_laser_engraver': 'LV',
        'sifter': 'LV',
        'wiremill': 'LV',
        
        // 高级机器
        'plasma_arc_furnace': 'EV',
        'pyrolyse_oven': 'EV',
        'cracking_unit': 'EV',
        'distillation_tower': 'EV',
        'electric_blast_furnace': 'EV',
        'implosion_compressor': 'EV',
        'vacuum_freezer': 'EV',
        'fusion_reactor': 'LuV',
        
        // 特殊机器
        'cosmos_simulation': 'MAX',
        'mega_blast_furnace': 'MAX',
        'mega_vacuum_freezer': 'MAX'
    };
    
    return voltageMap[machineType] || '未知';
}

/**
 * 验证配方兼容性
 * 检查配方参数与机器类型的兼容性
 */
function validateRecipeCompatibility(recipe) {
    var result = {
        valid: true,
        errors: [],
        warnings: []
    };
    
    if (!recipe || !recipe.type) {
        return result;
    }
    
    var machineType = recipe.type;
    var voltageLevel = getMachineVoltageLevel(machineType);
    
    // 检查EUt与电压等级的兼容性
    if (recipe.EUt != null && typeof recipe.EUt === 'number') {
        var eut = recipe.EUt;
        
        // 电压等级与典型EUt范围映射
        var voltageRanges = {
            'LV': { min: 1, max: 32, typical: [2, 4, 8, 16] },
            'MV': { min: 33, max: 128, typical: [64, 96, 128] },
            'HV': { min: 129, max: 512, typical: [128, 192, 256, 384, 512] },
            'EV': { min: 513, max: 2048, typical: [512, 768, 1024, 1536, 2048] },
            'IV': { min: 2049, max: 8192, typical: [2048, 3072, 4096, 6144, 8192] },
            'LuV': { min: 8193, max: 32768, typical: [8192, 12288, 16384, 24576, 32768] },
            'ZPM': { min: 32769, max: 131072, typical: [32768, 49152, 65536, 98304, 131072] },
            'UV': { min: 131073, max: 524288, typical: [131072, 196608, 262144, 393216, 524288] },
            'UHV': { min: 524289, max: 2097152, typical: [524288, 786432, 1048576, 1572864, 2097152] },
            'UEV': { min: 2097153, max: 8388608, typical: [2097152, 3145728, 4194304, 6291456, 8388608] },
            'UIV': { min: 8388609, max: 33554432, typical: [8388608, 12582912, 16777216, 25165824, 33554432] },
            'UXV': { min: 33554433, max: 134217728, typical: [33554432, 50331648, 67108864, 100663296, 134217728] },
            'OpV': { min: 134217729, max: 536870912, typical: [134217728, 201326592, 268435456, 402653184, 536870912] },
            'MAX': { min: 536870913, max: 2147483647, typical: [536870912, 805306368, 1073741824, 1610612736, 2147483647] }
        };
        
        var range = voltageRanges[voltageLevel];
        if (range) {
            if (eut < range.min) {
                result.warnings.push('EUt值 ' + eut + ' 可能过低，对于' + voltageLevel + '级机器，典型范围: ' + range.min + '-' + range.max);
            } else if (eut > range.max) {
                result.warnings.push('EUt值 ' + eut + ' 可能过高，对于' + voltageLevel + '级机器，典型范围: ' + range.min + '-' + range.max);
            }
            
            // 检查是否为典型值
            var isTypical = false;
            for (var i = 0; i < range.typical.length; i++) {
                if (eut === range.typical[i]) {
                    isTypical = true;
                    break;
                }
            }
            
            if (!isTypical && eut >= range.min && eut <= range.max) {
                result.warnings.push('EUt值 ' + eut + ' 不是' + voltageLevel + '级机器的典型值，典型值: ' + range.typical.join(', '));
            }
        }
    }
    
    // 检查duration与机器类型的兼容性
    if (recipe.duration != null && typeof recipe.duration === 'number') {
        var duration = recipe.duration;
        
        // 不同机器类型的典型duration范围
        var typicalDurations = {
            'macerator': { min: 50, max: 800 },
            'assembler': { min: 100, max: 1200 },
            'centrifuge': { min: 200, max: 1600 },
            'chemical_reactor': { min: 100, max: 800 },
            'electrolyzer': { min: 300, max: 2000 },
            'arc_furnace': { min: 100, max: 600 },
            'autoclave': { min: 200, max: 1200 },
            'blast_furnace': { min: 400, max: 2400 },
            'cracker': { min: 200, max: 800 },
            'distillery': { min: 150, max: 600 },
            'fermenter': { min: 300, max: 1800 },
            'fluid_solidifier': { min: 50, max: 400 },
            'forge_hammer': { min: 50, max: 400 },
            'lathe': { min: 100, max: 800 },
            'mixer': { min: 100, max: 800 },
            'ore_washer': { min: 200, max: 1200 },
            'packer': { min: 50, max: 400 },
            'polarizer': { min: 100, max: 600 },
            'sifter': { min: 300, max: 1800 },
            'wiremill': { min: 100, max: 800 }
        };
        
        var typical = typicalDurations[machineType];
        if (typical) {
            if (duration < typical.min) {
                result.warnings.push('duration值 ' + duration + ' 可能过短，对于' + machineType + '，典型范围: ' + typical.min + '-' + typical.max);
            } else if (duration > typical.max) {
                result.warnings.push('duration值 ' + duration + ' 可能过长，对于' + machineType + '，典型范围: ' + typical.min + '-' + typical.max);
            }
        }
    }
    
    return result;
}

// =====================================================
// =============== 冲突检测模块 ==================
// =====================================================

/**
 * 检测配方ID冲突
 * 检查是否有重复的配方ID
 */
function detectIdConflicts() {
    var result = {
        conflicts: [],
        duplicateIds: {},
        totalRecipes: 0,
        uniqueIds: 0
    };
    
    var allIds = getAllRecipeIds();
    result.totalRecipes = allIds.length;
    
    // 统计每个ID的出现次数
    var idCount = {};
    for (var i = 0; i < allIds.length; i++) {
        var id = allIds[i];
        idCount[id] = (idCount[id] || 0) + 1;
    }
    
    // 找出重复的ID
    for (var id in idCount) {
        if (idCount.hasOwnProperty(id)) {
            if (idCount[id] > 1) {
                result.duplicateIds[id] = idCount[id];
                
                // 查找所有出现位置
                var locations = [];
                var arrays = getAllRecipeArrays();
                
                for (var i = 0; i < arrays.length; i++) {
                    var arr = arrays[i].array;
                    if (!arr) continue;
                    
                    for (var j = 0; j < arr.length; j++) {
                        var recipe = arr[j];
                        if (recipe && recipe.id === id) {
                            locations.push(arrays[i].name + '[' + j + ']');
                        }
                    }
                }
                
                result.conflicts.push({
                    id: id,
                    count: idCount[id],
                    locations: locations
                });
            }
        }
    }
    
    result.uniqueIds = Object.keys(idCount).length;
    
    return result;
}

/**
 * 检测配方覆盖
 * 检查是否有相同机器类型和输入的配方
 */
function detectRecipeOverlaps() {
    var result = {
        overlaps: [],
        totalChecked: 0
    };
    
    // 简化的重叠检测：检查相同机器类型和类似输入的配方
    var arrays = getAllRecipeArrays();
    var recipeMap = {};
    
    for (var i = 0; i < arrays.length; i++) {
        var arr = arrays[i].array;
        if (!arr) continue;
        
        for (var j = 0; j < arr.length; j++) {
            var recipe = arr[j];
            if (!recipe || !recipe.id || !recipe.type) continue;
            
            result.totalChecked++;
            
            // 创建配方的简化签名
            var signature = recipe.type + ':' + 
                           (recipe.itemInputs ? JSON.stringify(recipe.itemInputs) : '[]') + ':' +
                           (recipe.inputFluids ? JSON.stringify(recipe.inputFluids) : '[]');
            
            if (!recipeMap[signature]) {
                recipeMap[signature] = [];
            }
            
            recipeMap[signature].push({
                id: recipe.id,
                location: arrays[i].name + '[' + j + ']',
                recipe: recipe
            });
        }
    }
    
    // 检查有多个配方的签名
    for (var signature in recipeMap) {
        if (recipeMap.hasOwnProperty(signature)) {
            var recipes = recipeMap[signature];
            if (recipes.length > 1) {
                result.overlaps.push({
                    signature: signature,
                    count: recipes.length,
                    recipes: recipes
                });
            }
        }
    }
    
    return result;
}

// =====================================================
// =============== 平衡性分析模块 ==================
// =====================================================

/**
 * 分析配方平衡性
 * 评估输入输出比例和能耗合理性
 */
function analyzeRecipeBalance(recipe) {
    var result = {
        balanced: true,
        score: 0, // 0-100分，越高越平衡
        issues: [],
        suggestions: []
    };
    
    if (!recipe) {
        return result;
    }
    
    var score = 100; // 初始满分
    
    // 1. 检查输入输出数量比例
    var inputItemCount = 0;
    var outputItemCount = 0;
    
    if (recipe.itemInputs && Array.isArray(recipe.itemInputs)) {
        inputItemCount = recipe.itemInputs.length;
    }
    
    if (recipe.itemOutputs && Array.isArray(recipe.itemOutputs)) {
        outputItemCount = recipe.itemOutputs.length;
    }
    
    // 输入输出比例异常检查
    if (inputItemCount === 0 && outputItemCount > 0) {
        result.issues.push('无物品输入但有物品输出，可能是创造配方或错误');
        score -= 20;
    }
    
    if (outputItemCount === 0) {
        result.issues.push('无物品输出，配方可能无意义');
        score -= 30;
    }
    
    // 2. 检查能耗合理性
    if (recipe.EUt != null && typeof recipe.EUt === 'number' && 
        recipe.duration != null && typeof recipe.duration === 'number') {
        
        var totalEnergy = recipe.EUt * recipe.duration;
        
        // 根据机器类型评估总能量消耗
        var machineType = recipe.type || 'unknown';
        var typicalEnergyRanges = {
            'macerator': { min: 1000, max: 64000 },
            'assembler': { min: 2000, max: 128000 },
            'centrifuge': { min: 4000, max: 256000 },
            'chemical_reactor': { min: 2000, max: 128000 },
            'electrolyzer': { min: 6000, max: 400000 },
            'arc_furnace': { min: 2000, max: 96000 },
            'blast_furnace': { min: 8000, max: 512000 }
        };
        
        var typicalRange = typicalEnergyRanges[machineType];
        if (typicalRange) {
            if (totalEnergy < typicalRange.min) {
                result.issues.push('总能耗 ' + totalEnergy + ' EU 可能过低，对于' + machineType + '，典型范围: ' + typicalRange.min + '-' + typicalRange.max + ' EU');
                score -= 10;
            } else if (totalEnergy > typicalRange.max) {
                result.issues.push('总能耗 ' + totalEnergy + ' EU 可能过高，对于' + machineType + '，典型范围: ' + typicalRange.min + '-' + typicalRange.max + ' EU');
                score -= 10;
            }
        }
        
        // 检查EU/t与duration的比例
        if (recipe.EUt > 0 && recipe.duration > 0) {
            var energyPerTick = recipe.EUt;
            var durationValue = recipe.duration;
            
            // 高EU/t配合理应较短duration
            if (energyPerTick > 1000 && durationValue > 1000) {
                result.suggestions.push('高能耗配方(' + energyPerTick + ' EU/t)配合长时间(' + durationValue + ' ticks)，考虑优化平衡');
                score -= 5;
            }
            
            // 低EU/t配合理应较长duration
            if (energyPerTick < 10 && durationValue < 50) {
                result.suggestions.push('低能耗配方(' + energyPerTick + ' EU/t)配合短时间(' + durationValue + ' ticks)，可能过于高效');
                score -= 5;
            }
        }
    }
    
    // 3. 检查电路配置
    if (recipe.circuit != null) {
        var circuitType = typeof recipe.circuit;
        if (circuitType !== 'number' && circuitType !== 'string') {
            // 对于对象类型，尝试检查是否可以转换为字符串
            if (circuitType === 'object' && recipe.circuit != null) {
                try {
                    String(recipe.circuit);
                    // 如果可以转换为字符串，则认为是有效的
                } catch (err) {
                    result.issues.push('circuit参数类型异常: ' + circuitType);
                    score -= 5;
                }
            } else {
                result.issues.push('circuit参数类型异常: ' + circuitType);
                score -= 5;
            }
        }
    }
    
    // 4. 检查特殊字段
    if (recipe.notConsumable) {
        result.suggestions.push('配方包含非消耗品(notConsumable)，确保这是有意设计');
    }
    
    if (recipe.notConsumableFluid) {
        result.suggestions.push('配方包含非消耗流体(notConsumableFluid)，确保这是有意设计');
    }
    
    // 计算最终得分
    result.score = Math.max(0, Math.min(100, score));
    result.balanced = result.score >= 70;
    
    return result;
}

// =====================================================
// =============== 批量验证模块 ==================
// =====================================================

/**
 * 验证单个配方
 * 执行所有验证模块
 */
function validateRecipe(recipeId) {
    debug('validateRecipe: 开始验证配方ID="' + recipeId + '"');
    var result = {
        recipeId: recipeId,
        found: false,
        valid: false,
        basicValidation: null,
        syntaxValidation: null,
        compatibilityValidation: null,
        balanceAnalysis: null,
        summary: '',
        timestamp: new Date().toLocaleString()
    };
    
    // 查找配方
    var recipeResult = findRecipeById(recipeId);
    if (!recipeResult) {
        warn('validateRecipe: 未找到配方 "' + recipeId + '"');
        result.summary = '❌ 未找到配方: ' + recipeId;
        return result;
    }
    
    result.found = true;
    var recipe = recipeResult.recipe;
    
    // 执行各项验证
    result.basicValidation = validateBasicStructure(recipe);
    result.syntaxValidation = validateRecipeSyntax(recipe);
    result.compatibilityValidation = validateRecipeCompatibility(recipe);
    result.balanceAnalysis = analyzeRecipeBalance(recipe);
    
    // 汇总结果
    var errorCount = 0;
    var warningCount = 0;
    
    errorCount += result.basicValidation.errors.length;
    warningCount += result.basicValidation.warnings.length;
    
    errorCount += result.syntaxValidation.errors.length;
    warningCount += result.syntaxValidation.warnings.length;
    
    warningCount += result.compatibilityValidation.warnings.length;
    
    warningCount += result.balanceAnalysis.issues.length;
    warningCount += result.balanceAnalysis.suggestions.length;
    
    // 确定总体有效性
    result.valid = result.basicValidation.valid && 
                   result.syntaxValidation.valid && 
                   errorCount === 0;
    
    // 生成摘要
    result.summary = '✅ 配方验证完成: ' + recipeId + '\n';
    result.summary += '📊 基本验证: ' + (result.basicValidation.valid ? '通过' : '失败') + '\n';
    result.summary += '🔤 语法验证: ' + (result.syntaxValidation.valid ? '通过' : '失败') + '\n';
    result.summary += '⚡ 平衡性评分: ' + result.balanceAnalysis.score + '/100\n';
    result.summary += '❌ 错误: ' + errorCount + ' 个\n';
    result.summary += '⚠️ 警告: ' + warningCount + ' 个\n';
    
    if (errorCount === 0 && warningCount === 0) {
        result.summary += '🎉 配方验证通过，无问题发现！';
    }
    
    return result;
}

/**
 * 验证所有配方
 * 批量验证所有配方
 */
function validateAllRecipes() {
    var allIds = getAllRecipeIds();
    var results = {
        total: allIds.length,
        validated: 0,
        valid: 0,
        invalid: 0,
        errors: 0,
        warnings: 0,
        recipeResults: [],
        summary: '',
        timestamp: new Date().toLocaleString()
    };
    
    info('开始批量验证 ' + allIds.length + ' 个配方...');
    
    for (var i = 0; i < allIds.length; i++) {
        var recipeId = allIds[i];
        var result = validateRecipe(recipeId);
        
        results.recipeResults.push(result);
        results.validated++;
        
        if (result.found) {
            if (result.valid) {
                results.valid++;
            } else {
                results.invalid++;
            }
            
            // 统计错误和警告
            if (result.basicValidation) {
                results.errors += result.basicValidation.errors.length;
                results.warnings += result.basicValidation.warnings.length;
            }
            
            if (result.syntaxValidation) {
                results.errors += result.syntaxValidation.errors.length;
                results.warnings += result.syntaxValidation.warnings.length;
            }
            
            if (result.compatibilityValidation) {
                results.warnings += result.compatibilityValidation.warnings.length;
            }
            
            if (result.balanceAnalysis) {
                results.warnings += result.balanceAnalysis.issues.length;
                results.warnings += result.balanceAnalysis.suggestions.length;
            }
        }
        
        // 进度报告
        if ((i + 1) % 50 === 0 || i + 1 === allIds.length) {
            debug('验证进度: ' + (i + 1) + '/' + allIds.length + ' (' + Math.round((i + 1) / allIds.length * 100) + '%)');
        }
    }
    
    // 生成摘要
    results.summary = '📊 批量验证报告\n';
    results.summary += '========================\n';
    results.summary += '总计配方: ' + results.total + '\n';
    results.summary += '已验证: ' + results.validated + '\n';
    results.summary += '有效配方: ' + results.valid + '\n';
    results.summary += '无效配方: ' + results.invalid + '\n';
    results.summary += '总错误: ' + results.errors + ' 个\n';
    results.summary += '总警告: ' + results.warnings + ' 个\n';
    results.summary += '成功率: ' + (results.total > 0 ? Math.round(results.valid / results.total * 100) : 0) + '%\n';
    results.summary += '========================\n';
    
    if (results.errors === 0 && results.warnings === 0) {
        results.summary += '🎉 所有配方验证通过，无问题发现！';
    } else if (results.errors === 0) {
        results.summary += '⚠️ 配方验证完成，有 ' + results.warnings + ' 个警告需要注意。';
    } else {
        results.summary += '❌ 配方验证完成，发现 ' + results.errors + ' 个错误和 ' + results.warnings + ' 个警告。';
    }
    
    info('批量验证完成: ' + results.summary.replace(/\n/g, ' '));
    
    return results;
}

// =====================================================
// =============== 报告生成模块 ==================
// =====================================================

/**
 * 生成详细验证报告
 */
function generateValidationReport() {
    var report = {
        timestamp: new Date().toLocaleString(),
        validationResults: validateAllRecipes(),
        conflictResults: detectIdConflicts(),
        overlapResults: detectRecipeOverlaps(),
        summary: ''
    };
    
    // 生成报告摘要
    report.summary = '📋 配方验证综合报告\n';
    report.summary += '生成时间: ' + report.timestamp + '\n';
    report.summary += '========================\n\n';
    
    // 验证结果
    report.summary += '1. 配方验证统计\n';
    report.summary += '----------------\n';
    report.summary += '总计配方: ' + report.validationResults.total + '\n';
    report.summary += '有效配方: ' + report.validationResults.valid + '\n';
    report.summary += '无效配方: ' + report.validationResults.invalid + '\n';
    report.summary += '错误数量: ' + report.validationResults.errors + ' 个\n';
    report.summary += '警告数量: ' + report.validationResults.warnings + ' 个\n';
    report.summary += '成功率: ' + (report.validationResults.total > 0 ? 
        Math.round(report.validationResults.valid / report.validationResults.total * 100) : 0) + '%\n\n';
    
    // 冲突检测结果
    report.summary += '2. 配方冲突检测\n';
    report.summary += '----------------\n';
    report.summary += '总计配方ID: ' + report.conflictResults.totalRecipes + '\n';
    report.summary += '唯一ID数量: ' + report.conflictResults.uniqueIds + '\n';
    report.summary += '重复ID数量: ' + report.conflictResults.conflicts.length + ' 个\n';
    
    if (report.conflictResults.conflicts.length > 0) {
        report.summary += '重复ID列表:\n';
        for (var i = 0; i < Math.min(report.conflictResults.conflicts.length, 10); i++) {
            var conflict = report.conflictResults.conflicts[i];
            report.summary += '  • ' + conflict.id + ' (出现 ' + conflict.count + ' 次)\n';
        }
        if (report.conflictResults.conflicts.length > 10) {
            report.summary += '  ... 还有 ' + (report.conflictResults.conflicts.length - 10) + ' 个重复ID\n';
        }
    } else {
        report.summary += '✅ 无ID冲突\n';
    }
    report.summary += '\n';
    
    // 重叠检测结果
    report.summary += '3. 配方重叠检测\n';
    report.summary += '----------------\n';
    report.summary += '检查配方数: ' + report.overlapResults.totalChecked + '\n';
    report.summary += '疑似重叠: ' + report.overlapResults.overlaps.length + ' 组\n';
    
    if (report.overlapResults.overlaps.length > 0) {
        report.summary += '重叠配方组:\n';
        for (var i = 0; i < Math.min(report.overlapResults.overlaps.length, 5); i++) {
            var overlap = report.overlapResults.overlaps[i];
            report.summary += '  • 第 ' + (i + 1) + ' 组 (' + overlap.count + ' 个配方)\n';
        }
        if (report.overlapResults.overlaps.length > 5) {
            report.summary += '  ... 还有 ' + (report.overlapResults.overlaps.length - 5) + ' 组重叠\n';
        }
    } else {
        report.summary += '✅ 无配方重叠\n';
    }
    report.summary += '\n';
    
    // 建议
    report.summary += '4. 建议\n';
    report.summary += '----------------\n';
    if (report.validationResults.errors > 0) {
        report.summary += '• 修复 ' + report.validationResults.errors + ' 个验证错误\n';
    }
    if (report.validationResults.warnings > 0) {
        report.summary += '• 检查 ' + report.validationResults.warnings + ' 个验证警告\n';
    }
    if (report.conflictResults.conflicts.length > 0) {
        report.summary += '• 解决 ' + report.conflictResults.conflicts.length + ' 个ID冲突\n';
    }
    if (report.overlapResults.overlaps.length > 0) {
        report.summary += '• 检查 ' + report.overlapResults.overlaps.length + ' 组配方重叠\n';
    }
    
    if (report.validationResults.errors === 0 && 
        report.validationResults.warnings === 0 &&
        report.conflictResults.conflicts.length === 0 &&
        report.overlapResults.overlaps.length === 0) {
        report.summary += '✅ 所有检查通过，配方库状态良好！\n';
    }
    
    return report;
}

// =====================================================
// =============== 玩家控制接口 ==================
// =====================================================

/**
 * 检查玩家是否为OP
 */
function isPlayerOp(player) {
    if (!player || typeof player !== 'object') return false;
    return player.op === true;
}

/**
 * 向玩家发送消息
 */
function sendMessageToPlayer(player, message) {
    if (!player || typeof player.tell !== 'function') return;
    try {
        player.tell(message);
    } catch (err) {
        // 忽略发送消息错误
    }
}

/**
 * 处理配方验证命令
 * 格式: /配方验证 <配方ID>
 */
function handleValidateCommand(player, args) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    if (args.length < 1) {
        sendMessageToPlayer(player, '§e用法: /配方验证 <配方ID>');
        sendMessageToPlayer(player, '§7示例: /配方验证 dishanhai:my_recipe');
        return false;
    }
    
    var recipeId = args[0];
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a正在验证配方: §e' + recipeId);
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    var result = validateRecipe(recipeId);
    
    if (!result.found) {
        sendMessageToPlayer(player, '§c❌ 未找到配方: ' + recipeId);
        sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
        return false;
    }
    
    // 显示验证结果
    sendMessageToPlayer(player, '§a✅ 配方验证完成: §e' + recipeId);
    sendMessageToPlayer(player, '§7总体状态: §e' + (result.valid ? '有效' : '无效'));
    
    // 显示基本验证结果
    if (result.basicValidation) {
        var basic = result.basicValidation;
        if (basic.errors.length > 0) {
            sendMessageToPlayer(player, '§c❌ 基本验证错误:');
            for (var i = 0; i < Math.min(basic.errors.length, 3); i++) {
                sendMessageToPlayer(player, '  §7• §c' + basic.errors[i]);
            }
            if (basic.errors.length > 3) {
                sendMessageToPlayer(player, '  §7... 还有 ' + (basic.errors.length - 3) + ' 个错误');
            }
        }
        
        if (basic.warnings.length > 0) {
            sendMessageToPlayer(player, '§e⚠️ 基本验证警告:');
            for (var i = 0; i < Math.min(basic.warnings.length, 3); i++) {
                sendMessageToPlayer(player, '  §7• §e' + basic.warnings[i]);
            }
            if (basic.warnings.length > 3) {
                sendMessageToPlayer(player, '  §7... 还有 ' + (basic.warnings.length - 3) + ' 个警告');
            }
        }
    }
    
    // 显示语法验证结果
    if (result.syntaxValidation) {
        var syntax = result.syntaxValidation;
        if (syntax.errors.length > 0) {
            sendMessageToPlayer(player, '§c❌ 语法验证错误:');
            for (var i = 0; i < Math.min(syntax.errors.length, 3); i++) {
                sendMessageToPlayer(player, '  §7• §c' + syntax.errors[i]);
            }
        }
    }
    
    // 显示平衡性分析结果
    if (result.balanceAnalysis) {
        var balance = result.balanceAnalysis;
        sendMessageToPlayer(player, '§b📊 平衡性分析:');
        sendMessageToPlayer(player, '  §7评分: §e' + balance.score + '/100 §7(平衡: ' + (balance.balanced ? '是' : '否') + ')');
        
        if (balance.issues.length > 0) {
            sendMessageToPlayer(player, '  §7问题:');
            for (var i = 0; i < Math.min(balance.issues.length, 2); i++) {
                sendMessageToPlayer(player, '    §7• §e' + balance.issues[i]);
            }
        }
        
        if (balance.suggestions.length > 0) {
            sendMessageToPlayer(player, '  §7建议:');
            for (var i = 0; i < Math.min(balance.suggestions.length, 2); i++) {
                sendMessageToPlayer(player, '    §7• §a' + balance.suggestions[i]);
            }
        }
    }
    
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    if (result.valid) {
        sendMessageToPlayer(player, '§a✅ 配方验证通过！');
    } else {
        sendMessageToPlayer(player, '§c❌ 配方验证失败，请查看上述错误信息。');
    }
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    
    return result.valid;
}

/**
 * 处理全部验证命令
 * 格式: /配方验证全部
 */
function handleValidateAllCommand(player) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a正在验证所有配方...');
    sendMessageToPlayer(player, '§7这可能需要一些时间，请稍候...');
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    var results = validateAllRecipes();
    
    sendMessageToPlayer(player, '§a📊 批量验证完成！');
    sendMessageToPlayer(player, '§7总计配方: §e' + results.total + ' 个');
    sendMessageToPlayer(player, '§7有效配方: §e' + results.valid + ' 个');
    sendMessageToPlayer(player, '§7无效配方: §e' + results.invalid + ' 个');
    sendMessageToPlayer(player, '§7总错误: §c' + results.errors + ' 个');
    sendMessageToPlayer(player, '§7总警告: §e' + results.warnings + ' 个');
    sendMessageToPlayer(player, '§7成功率: §a' + (results.total > 0 ? Math.round(results.valid / results.total * 100) : 0) + '%');
    
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    if (results.errors === 0 && results.warnings === 0) {
        sendMessageToPlayer(player, '§a🎉 所有配方验证通过，无问题发现！');
    } else if (results.errors === 0) {
        sendMessageToPlayer(player, '§e⚠️ 验证完成，有 ' + results.warnings + ' 个警告需要注意。');
    } else {
        sendMessageToPlayer(player, '§c❌ 验证完成，发现 ' + results.errors + ' 个错误和 ' + results.warnings + ' 个警告。');
    }
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    
    return results.errors === 0;
}

/**
 * 处理验证报告命令
 * 格式: /配方验证报告
 */
function handleValidateReportCommand(player) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a正在生成配方验证报告...');
    sendMessageToPlayer(player, '§7这可能需要一些时间，请稍候...');
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    var report = generateValidationReport();
    
    sendMessageToPlayer(player, '§a📋 配方验证综合报告');
    sendMessageToPlayer(player, '§7生成时间: §e' + report.timestamp);
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    // 显示报告摘要
    var summaryLines = report.summary.split('\n');
    for (var i = 0; i < Math.min(summaryLines.length, 20); i++) {
        if (summaryLines[i].trim()) {
            sendMessageToPlayer(player, '§7' + summaryLines[i]);
        }
    }
    
    if (summaryLines.length > 20) {
        sendMessageToPlayer(player, '§7... 报告内容较多，完整报告请查看控制台日志');
    }
    
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    sendMessageToPlayer(player, '§a✅ 报告生成完成！');
    sendMessageToPlayer(player, '§7完整报告已输出到控制台日志');
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    
    // 同时输出到控制台
    info('配方验证报告:\n' + report.summary);
    
    return true;
}

/**
 * 处理冲突检测命令
 * 格式: /配方冲突检测
 */
function handleConflictDetectionCommand(player) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a正在检测配方冲突...');
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    var conflicts = detectIdConflicts();
    
    sendMessageToPlayer(player, '§a🔍 配方冲突检测结果');
    sendMessageToPlayer(player, '§7总计配方ID: §e' + conflicts.totalRecipes + ' 个');
    sendMessageToPlayer(player, '§7唯一ID数量: §e' + conflicts.uniqueIds + ' 个');
    sendMessageToPlayer(player, '§7重复ID数量: §e' + conflicts.conflicts.length + ' 个');
    
    if (conflicts.conflicts.length > 0) {
        sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
        sendMessageToPlayer(player, '§c❌ 发现重复ID:');
        
        for (var i = 0; i < Math.min(conflicts.conflicts.length, 5); i++) {
            var conflict = conflicts.conflicts[i];
            sendMessageToPlayer(player, '§7• §c' + conflict.id + ' §7(出现 §e' + conflict.count + ' §7次)');
            
            // 显示前2个位置
            for (var j = 0; j < Math.min(conflict.locations.length, 2); j++) {
                sendMessageToPlayer(player, '  §7位置 ' + (j + 1) + ': §e' + conflict.locations[j]);
            }
            
            if (conflict.locations.length > 2) {
                sendMessageToPlayer(player, '  §7... 还有 ' + (conflict.locations.length - 2) + ' 个位置');
            }
        }
        
        if (conflicts.conflicts.length > 5) {
            sendMessageToPlayer(player, '§7... 还有 ' + (conflicts.conflicts.length - 5) + ' 个重复ID未显示');
        }
        
        sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
        sendMessageToPlayer(player, '§c⚠️ 建议修复重复的配方ID以避免冲突');
    } else {
        sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
        sendMessageToPlayer(player, '§a✅ 无ID冲突发现！');
    }
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    
    return conflicts.conflicts.length === 0;
}

/**
 * 处理平衡分析命令
 * 格式: /配方平衡分析 <配方ID>
 */
function handleBalanceAnalysisCommand(player, args) {
    debug('handleBalanceAnalysisCommand: 玩家 ' + (player ? player.name : '控制台') + ' 请求分析配方，参数=' + JSON.stringify(args));
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    if (args.length < 1) {
        sendMessageToPlayer(player, '§e用法: /配方平衡分析 <配方ID>');
        sendMessageToPlayer(player, '§7示例: /配方平衡分析 dishanhai:my_recipe');
        return false;
    }
    
    var recipeId = args[0];
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a正在分析配方平衡性: §e' + recipeId);
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    var recipeResult = findRecipeById(recipeId);
    if (!recipeResult) {
        sendMessageToPlayer(player, '§c❌ 未找到配方: ' + recipeId);
        sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
        return false;
    }
    
    var recipe = recipeResult.recipe;
    var analysis = analyzeRecipeBalance(recipe);
    
    sendMessageToPlayer(player, '§a📊 配方平衡性分析结果');
    sendMessageToPlayer(player, '§7配方ID: §e' + recipeId);
    sendMessageToPlayer(player, '§7机器类型: §e' + recipe.type);
    sendMessageToPlayer(player, '§7平衡性评分: §e' + analysis.score + '/100');
    sendMessageToPlayer(player, '§7是否平衡: §e' + (analysis.balanced ? '是' : '否'));
    
    if (analysis.issues.length > 0) {
        sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
        sendMessageToPlayer(player, '§e⚠️ 发现的问题:');
        for (var i = 0; i < Math.min(analysis.issues.length, 5); i++) {
            sendMessageToPlayer(player, '§7• §e' + analysis.issues[i]);
        }
        if (analysis.issues.length > 5) {
            sendMessageToPlayer(player, '§7... 还有 ' + (analysis.issues.length - 5) + ' 个问题');
        }
    }
    
    if (analysis.suggestions.length > 0) {
        sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
        sendMessageToPlayer(player, '§a💡 优化建议:');
        for (var i = 0; i < Math.min(analysis.suggestions.length, 5); i++) {
            sendMessageToPlayer(player, '§7• §a' + analysis.suggestions[i]);
        }
        if (analysis.suggestions.length > 5) {
            sendMessageToPlayer(player, '§7... 还有 ' + (analysis.suggestions.length - 5) + ' 条建议');
        }
    }
    
    // 显示配方详细信息
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    sendMessageToPlayer(player, '§b📝 配方详细信息:');
    
    if (recipe.duration != null) {
        sendMessageToPlayer(player, '§7处理时间: §e' + recipe.duration + ' ticks');
    }
    
    if (recipe.EUt != null) {
        sendMessageToPlayer(player, '§7能量消耗: §e' + recipe.EUt + ' EU/t');
        
        if (recipe.duration != null) {
            var totalEnergy = recipe.EUt * recipe.duration;
            sendMessageToPlayer(player, '§7总能耗: §e' + totalEnergy + ' EU');
        }
    }
    
    if (recipe.itemInputs && recipe.itemInputs.length > 0) {
        sendMessageToPlayer(player, '§7物品输入: §e' + recipe.itemInputs.length + ' 种');
        for (var i = 0; i < Math.min(recipe.itemInputs.length, 3); i++) {
            sendMessageToPlayer(player, '  §7• §e' + recipe.itemInputs[i]);
        }
        if (recipe.itemInputs.length > 3) {
            sendMessageToPlayer(player, '  §7... 还有 ' + (recipe.itemInputs.length - 3) + ' 种物品');
        }
    }
    
    if (recipe.itemOutputs && recipe.itemOutputs.length > 0) {
        sendMessageToPlayer(player, '§7物品输出: §e' + recipe.itemOutputs.length + ' 种');
        for (var i = 0; i < Math.min(recipe.itemOutputs.length, 3); i++) {
            sendMessageToPlayer(player, '  §7• §e' + recipe.itemOutputs[i]);
        }
        if (recipe.itemOutputs.length > 3) {
            sendMessageToPlayer(player, '  §7... 还有 ' + (recipe.itemOutputs.length - 3) + ' 种物品');
        }
    }
    
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    if (analysis.balanced) {
        sendMessageToPlayer(player, '§a✅ 配方平衡性良好！');
    } else {
        sendMessageToPlayer(player, '§e⚠️ 配方平衡性需要优化，请参考上述建议。');
    }
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    
    return analysis.balanced;
}

/**
 * 处理帮助命令
 * 格式: /配方验证帮助
 */
function handleHelpCommand(player) {
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a山海私货 · 配方验证API');
    sendMessageToPlayer(player, '§7版本: v1.0.0 - 仅限OP玩家使用');
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    sendMessageToPlayer(player, '§e可用命令:');
    sendMessageToPlayer(player, '§7/配方验证 <配方ID> §f- 验证单个配方');
    sendMessageToPlayer(player, '§7/配方验证全部 §f- 验证所有配方');
    sendMessageToPlayer(player, '§7/配方验证报告 §f- 生成详细验证报告');
    sendMessageToPlayer(player, '§7/配方冲突检测 §f- 检测配方ID冲突');
    sendMessageToPlayer(player, '§7/配方平衡分析 <配方ID> §f- 分析配方平衡性');
    sendMessageToPlayer(player, '§7/配方验证帮助 §f- 显示此帮助信息');
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    sendMessageToPlayer(player, '§e验证功能说明:');
    sendMessageToPlayer(player, '§7• §f基本验证 §7- 检查必需字段和类型');
    sendMessageToPlayer(player, '§7• §f语法验证 §7- 检查物品/流体格式');
    sendMessageToPlayer(player, '§7• §f兼容性验证 §7- 检查机器类型和电压等级');
    sendMessageToPlayer(player, '§7• §f平衡性分析 §7- 分析输入输出比例和能耗');
    sendMessageToPlayer(player, '§7• §f冲突检测 §7- 检测重复ID和配方重叠');
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    sendMessageToPlayer(player, '§e示例:');
    sendMessageToPlayer(player, '§7/配方验证 dishanhai:my_recipe');
    sendMessageToPlayer(player, '§7/配方验证全部');
    sendMessageToPlayer(player, '§7/配方平衡分析 dishanhai:powerful_recipe');
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    return true;
}

// =====================================================
// =============== 聊天命令注册 ==================
// =====================================================

ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands;
    var Arguments = event.arguments;
    
    // 注册 /配方验证 命令
    event.register(
        Commands.literal('配方验证')
            .requires(source => {
                // 检查是否为玩家且为OP
                if (source.getEntity && source.getEntity()) {
                    var player = source.getEntity();
                    return isPlayerOp(player);
                }
                return source.hasPermission(2); // OP权限等级2
            })
            .then(Commands.argument('args', Arguments.GREEDY_STRING.create(event))
                .executes(function(ctx) {
                    var source = ctx.source;
                    var player = source.getEntity ? source.getEntity() : null;
                    var argsStr = Arguments.GREEDY_STRING.getResult(ctx, 'args');
                    var args = argsStr ? argsStr.split(' ') : [];
                    
                    if (player) {
                        handleValidateCommand(player, args);
                    } else {
                        // 控制台执行
                        console.log('控制台执行配方验证: ' + argsStr);
                        if (args.length >= 1) {
                            var result = validateRecipe(args[0]);
                            console.log('验证结果: ' + JSON.stringify(result, null, 2));
                        }
                    }
                    return 1;
                })
            )
    );
    
    // 注册 /配方验证全部 命令
    event.register(
        Commands.literal('配方验证全部')
            .requires(function(source) {
                if (source.getEntity && source.getEntity()) {
                    var player = source.getEntity();
                    return isPlayerOp(player);
                }
                return source.hasPermission(2);
            })
            .executes(function(ctx) {
                var source = ctx.source;
                var player = source.getEntity ? source.getEntity() : null;
                
                if (player) {
                    handleValidateAllCommand(player);
                } else {
                    console.log('控制台执行全部验证');
                    var results = validateAllRecipes();
                    console.log('验证结果: ' + results.summary);
                }
                return 1;
            })
    );
    
    // 注册 /配方验证报告 命令
    event.register(
        Commands.literal('配方验证报告')
            .requires(function(source) {
                if (source.getEntity && source.getEntity()) {
                    var player = source.getEntity();
                    return isPlayerOp(player);
                }
                return source.hasPermission(2);
            })
            .executes(function(ctx) {
                var source = ctx.source;
                var player = source.getEntity ? source.getEntity() : null;
                
                if (player) {
                    handleValidateReportCommand(player);
                } else {
                    console.log('控制台生成验证报告');
                    var report = generateValidationReport();
                    console.log('验证报告:\n' + report.summary);
                }
                return 1;
            })
    );
    
    // 注册 /配方冲突检测 命令
    event.register(
        Commands.literal('配方冲突检测')
            .requires(function(source) {
                if (source.getEntity && source.getEntity()) {
                    var player = source.getEntity();
                    return isPlayerOp(player);
                }
                return source.hasPermission(2);
            })
            .executes(function(ctx) {
                var source = ctx.source;
                var player = source.getEntity ? source.getEntity() : null;
                
                if (player) {
                    handleConflictDetectionCommand(player);
                } else {
                    console.log('控制台执行冲突检测');
                    var conflicts = detectIdConflicts();
                    console.log('冲突检测结果: ' + JSON.stringify(conflicts, null, 2));
                }
                return 1;
            })
    );
    
    // 注册 /配方平衡分析 命令
    event.register(
        Commands.literal('配方平衡分析')
            .requires(function(source) {
                if (source.getEntity && source.getEntity()) {
                    var player = source.getEntity();
                    return isPlayerOp(player);
                }
                return source.hasPermission(2);
            })
            .then(Commands.argument('id', Arguments.GREEDY_STRING.create(event))
                .executes(function(ctx) {
                    var source = ctx.source;
                    var player = source.getEntity ? source.getEntity() : null;
                    var recipeId = Arguments.GREEDY_STRING.getResult(ctx, 'id');
                    
                    if (player) {
                        handleBalanceAnalysisCommand(player, [recipeId]);
                    } else {
                        console.log('控制台执行平衡分析: ' + recipeId);
                        var recipeResult = findRecipeById(recipeId);
                        if (recipeResult) {
                            var analysis = analyzeRecipeBalance(recipeResult.recipe);
                            console.log('平衡分析结果: ' + JSON.stringify(analysis, null, 2));
                        } else {
                            console.log('未找到配方: ' + recipeId);
                        }
                    }
                    return 1;
                })
            )
    );
    
    // 注册 /配方验证帮助 命令
    event.register(
        Commands.literal('配方验证帮助')
            .requires(function(source) {
                if (source.getEntity && source.getEntity()) {
                    var player = source.getEntity();
                    return isPlayerOp(player);
                }
                return true; // 帮助命令对所有人开放
            })
            .executes(function(ctx) {
                var source = ctx.source;
                var player = source.getEntity ? source.getEntity() : null;
                
                if (player) {
                    handleHelpCommand(player);
                } else {
                    console.log('配方验证API帮助 - 可用命令: /配方验证, /配方验证全部, /配方验证报告, /配方冲突检测, /配方平衡分析, /配方验证帮助');
                }
                return 1;
            })
    );
    
    info('配方验证API聊天命令已注册');
});

// =====================================================
// =============== 全局API导出 ==================
// =====================================================

// 导出到全局命名空间，供其他脚本使用
global.shanhaiRecipeValidationAPI = {
    // 基础验证函数
    validateRecipe: validateRecipe,
    validateAllRecipes: validateAllRecipes,
    generateValidationReport: generateValidationReport,
    
    // 验证模块函数
    validateBasicStructure: validateBasicStructure,
    validateRecipeSyntax: validateRecipeSyntax,
    validateRecipeCompatibility: validateRecipeCompatibility,
    analyzeRecipeBalance: analyzeRecipeBalance,
    
    // 冲突检测函数
    detectIdConflicts: detectIdConflicts,
    detectRecipeOverlaps: detectRecipeOverlaps,
    
    // 工具函数
    findRecipeById: findRecipeById,
    getAllRecipeArrays: getAllRecipeArrays,
    getAllRecipeIds: getAllRecipeIds,
    getMachineVoltageLevel: getMachineVoltageLevel,
    
    // 命令处理函数
    handleValidateCommand: handleValidateCommand,
    handleValidateAllCommand: handleValidateAllCommand,
    handleValidateReportCommand: handleValidateReportCommand,
    handleConflictDetectionCommand: handleConflictDetectionCommand,
    handleBalanceAnalysisCommand: handleBalanceAnalysisCommand,
    handleHelpCommand: handleHelpCommand,
    
    // 版本信息
    version: '1.0.0'
};

// =====================================================
// =============== 初始化日志 ==================
// =====================================================

info('§6═══════════════════════════════════════════════════════════');
info('§a✨ 山海私货 · 配方验证API 加载完成！');
info('§6═══════════════════════════════════════════════════════════');
info('§d📋 配方验证API已就绪');
info('§7功能: §e基本验证§7, §e语法验证§7, §e兼容性验证§7, §e平衡性分析§7, §e冲突检测');
info('§7聊天命令: §e/配方验证§7, §e/配方验证全部§7, §e/配方验证报告§7, §e/配方冲突检测§7, §e/配方平衡分析§7, §e/配方验证帮助');
info('§7全局API: §eglobal.shanhaiRecipeValidationAPI');
info('§7权限要求: §c仅限OP玩家使用');
info('§6═══════════════════════════════════════════════════════════');

})(); // IIFE结束