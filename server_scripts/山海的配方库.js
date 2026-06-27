// priority:60
ServerEvents.recipes(function(e) {
   var gtr = e.recipes.gtceu;  global._shanhaiGTR = gtr;
   DShanhaiRecipeEngine.resetRecipeStats();
   // 配方库独立运行时需要的shim函数 (依赖big私货中定义,priority:60先于70执行)
   var debug = (typeof debug !== 'undefined') ? debug : function(m) { console.log('[配方库] ' + m); };
   var broadcastRecipeError = (typeof broadcastRecipeError !== 'undefined') ? broadcastRecipeError : function(type, id, msg) { console.error('[配方错误] ' + type + ': ' + id + ' - ' + msg); };
   var normalizeRecipeId = function(recipeId) {
       if (recipeId === null || recipeId === undefined) return '';
       var value = String(recipeId);
       return value.indexOf(':') >= 0 ? value : 'dishanhai:' + value;
   };
   var getRecipeConfigValue = function(config, recipeId) {
       if (!config || !recipeId) return null;
       var normalized = normalizeRecipeId(recipeId);
       var shortId = normalized.indexOf('dishanhai:') === 0 ? normalized.substring(10) : normalized;
       var keys = [String(recipeId), normalized, shortId];
       for (var i = 0; i < keys.length; i++) {
           var key = keys[i];
           if (config[key] === true || config[key] === false) return config[key];
       }
       return null;
   };
   var localIsRecipeEnabled = function(recipeId, defaultEnabled, recipeLoadConfig) {
       var configured = getRecipeConfigValue(recipeLoadConfig, recipeId);
       if (configured !== null) return configured;
       return defaultEnabled !== false;
   };
   var engineIsRecipeEnabled = function(recipeId, defaultEnabled, recipeLoadConfig) {
       try {
           return DShanhaiRecipeEngine.isRecipeEnabled(String(recipeId), defaultEnabled, recipeLoadConfig);
       } catch (err) {
           return localIsRecipeEnabled(recipeId, defaultEnabled, recipeLoadConfig);
       }
   };
   var engineSafeAddRecipe = function(recipeObj, recipeLoadConfig) {
       if (!engineIsRecipeEnabled(recipeObj.id, recipeObj.defaultEnabled, recipeLoadConfig)) return true;
       try {
           return DShanhaiRecipeEngine.safeAddRecipe(gtr, recipeObj, recipeLoadConfig);
       } catch (err) {
           return DShanhaiRecipeEngine.safeAddRecipe(gtr, recipeObj);
       }
   };
   var safeAddRecipe = function(arg1, arg2, arg3, arg4) {
       var recipeLoadConfig = global.shanhaiRecipeLoadConfig || {};
       try {
           if (typeof arg1 === 'object' && arg1 !== null) {
                return engineSafeAddRecipe(arg1, recipeLoadConfig);
           }
           if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null) {
               if (!arg2.type) arg2.type = arg1;
                return engineSafeAddRecipe(arg2, recipeLoadConfig);
           }
           if (typeof arg1 === 'string' && typeof arg2 === 'string' && typeof arg3 === 'function') {
               var recipeObj = { type: arg1, id: arg2 };
               if (arg4 && typeof arg4 === 'object' && typeof arg4.defaultEnabled === 'boolean') {
                   recipeObj.defaultEnabled = arg4.defaultEnabled;
               }
                 if (!engineIsRecipeEnabled(arg2, recipeObj.defaultEnabled, recipeLoadConfig)) {
                    DShanhaiRecipeEngine.recordSkippedRecipe(arg1, arg2, '配方加载已禁用，已跳过');
                    return true;
                }
                try {
                    arg3(recipeObj);
                    DShanhaiRecipeEngine.recordRecipe(arg1, true, arg2, 'callback 注册完成');
                    return true;
                } catch (callbackErr) {
                    DShanhaiRecipeEngine.recordRecipe(arg1, false, arg2, String(callbackErr));
                    throw callbackErr;
                }
           }
           console.error('[safeAddRecipe] 不支持的调用参数');
           return false;
       } catch (err) {
           var recipeId = (typeof arg2 === 'string') ? arg2 : (arg1 && arg1.id ? arg1.id : 'unknown');
           console.error('[safeAddRecipe compat] ' + recipeId + ' 注册失败: ' + err);
           return false;
       }
   };
   var VA = [8,32,128,512,2048,8192,32768,131072,524288,2097152,8388608,33554432,134217728,536870912,2147483647];
   var ULV=VA[0],LV=VA[1],MV=VA[2],HV=VA[3],EV=VA[4],IV=VA[5],LuV=VA[6],ZPM=VA[7],UV=VA[8],UHV=VA[9],UEV=VA[10],UIV=VA[11],UXV=VA[12],OpV=VA[13],MAX=VA[14];
   var ulv=VA[0],lv=VA[1],mv=VA[2],hv=VA[3],ev=VA[4],iv=VA[5],luv=VA[6],zpm=VA[7],uv=VA[8],uhv=VA[9],uev=VA[10],uiv=VA[11],uxv=VA[12],opv=VA[13],max=VA[14];
   
//==========     组装机      ==========
const assrecipes = [
    { 
        id: 'mk1_comsic',
        type: 'assembler', 
        itemInputs: ['114514x kubejs:space_probe_mk1', '114514x kubejs:space_probe_mk2', '5413x kubejs:space_probe_mk3', '64x gtceu:opv_field_generator'],
        inputFluids: [],
        notConsumable: null,
        itemOutputs: ['dishanhai:cosmic_probe_mk'],
        outputFluids: [],
        circuit: null,
        EUt: opv,
        duration: 20
    },
    //这是测试配方列表 他们用于测试错误处理机制 正常情况他们不会被启用
     /*{ 
        id: 'test_error_recipe',
        type: 'assembler', 
        itemInputs: ['1x minecraft:stick', '1x minecraft:stone'],
        inputFluids: [],
        notConsumable: null,
        itemOutputs: ['minecraft:diamond'],
        outputFluids: [],
        circuit: null,
        EUt: opv
        // 故意缺少duration参数以触发错误
    },
    { 
        id: 'test_invalid_machine',
        type: 'invalid_machine_type', 
        itemInputs: ['1x minecraft:dirt'],
        inputFluids: [],
        notConsumable: null,
        itemOutputs: ['minecraft:gold_ingot'],
        outputFluids: [],
        circuit: null,
        EUt: opv,
        duration: 20
        // 故意使用无效的机器类型以触发错误
    },
    { 
        id: 'test_js_execution_error',
        type: 'assembler', 
        itemInputs: ['1x minecraft:stick'],
        inputFluids: [],
        notConsumable: null,
        itemOutputs: ['minecraft:diamond'],
        outputFluids: [],
        circuit: null,
        EUt: opv,
        duration: 20,
        // 添加一个特殊标记，让配方函数抛出错误
        triggerJsError: true
    }
    { 
        id: 'test_recipe_load_control',
        type: 'assembler', 
        itemInputs: ['1x minecraft:iron_ingot', '1x minecraft:redstone'],
        inputFluids: [],
        notConsumable: null,
        itemOutputs: ['1x minecraft:redstone_block'],
        outputFluids: [],
        circuit: null,
        EUt: mv,uev
        duration: 100
    }*/,
    // ========== 可编程仓 ×15 (对应输入总线 + LV电路板) ==========
    { id: 'ulv_programmable_hatch',  type: 'assembler', itemInputs: ['gtceu:ulv_input_bus', 'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:ulv_programmable_hatch'],  circuit: 16, EUt: 8,  duration: 100 },
    { id: 'lv_programmable_hatch',   type: 'assembler', itemInputs: ['gtceu:lv_input_bus',  'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:lv_programmable_hatch'],   circuit: 16, EUt: 8,  duration: 100 },
    { id: 'mv_programmable_hatch',   type: 'assembler', itemInputs: ['gtceu:mv_input_bus',  'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:mv_programmable_hatch'],   circuit: 16, EUt: 8,  duration: 100 },
    { id: 'hv_programmable_hatch',   type: 'assembler', itemInputs: ['gtceu:hv_input_bus',  'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:hv_programmable_hatch'],   circuit: 16, EUt: 8,  duration: 100 },
    { id: 'ev_programmable_hatch',   type: 'assembler', itemInputs: ['gtceu:ev_input_bus',  'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:ev_programmable_hatch'],   circuit: 16, EUt: 8,  duration: 100 },
    { id: 'iv_programmable_hatch',   type: 'assembler', itemInputs: ['gtceu:iv_input_bus',  'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:iv_programmable_hatch'],   circuit: 16, EUt: 8,  duration: 100 },
    { id: 'luv_programmable_hatch',  type: 'assembler', itemInputs: ['gtceu:luv_input_bus', 'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:luv_programmable_hatch'],  circuit: 16, EUt: 8,  duration: 100 },
    { id: 'zpm_programmable_hatch',  type: 'assembler', itemInputs: ['gtceu:zpm_input_bus', 'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:zpm_programmable_hatch'],  circuit: 16, EUt: 8,  duration: 100 },
    { id: 'uv_programmable_hatch',   type: 'assembler', itemInputs: ['gtceu:uv_input_bus',  'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:uv_programmable_hatch'],   circuit: 16, EUt: 8,  duration: 100 },
    { id: 'uhv_programmable_hatch',  type: 'assembler', itemInputs: ['gtceu:uhv_input_bus', 'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:uhv_programmable_hatch'],  circuit: 16, EUt: 8,  duration: 100 },
    { id: 'uev_programmable_hatch',  type: 'assembler', itemInputs: ['gtceu:uev_input_bus', 'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:uev_programmable_hatch'],  circuit: 16, EUt: 8,  duration: 100 },
    { id: 'uiv_programmable_hatch',  type: 'assembler', itemInputs: ['gtceu:uiv_input_bus', 'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:uiv_programmable_hatch'],  circuit: 16, EUt: 8,  duration: 100 },
    { id: 'uxv_programmable_hatch',  type: 'assembler', itemInputs: ['gtceu:uxv_input_bus', 'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:uxv_programmable_hatch'],  circuit: 16, EUt: 8,  duration: 100 },
    { id: 'opv_programmable_hatch',  type: 'assembler', itemInputs: ['gtceu:opv_input_bus', 'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:opv_programmable_hatch'],  circuit: 16, EUt: 8,  duration: 100 },
    { id: 'programmable_hatch',      type: 'assembler', itemInputs: ['gtceu:max_input_bus', 'gtceu:basic_integrated_circuit'], itemOutputs: ['gt_shanhai:programmable_hatch'],      circuit: 16, EUt: 8,  duration: 100 }
];

// 配方验证函数
function validateRecipe(recipe) {
    if (!gtr[recipe.type]) {
        return { valid: false, error: `未知机器类型: ${recipe.type}` };
    }
    return { valid: true };
}
/*
gtr.black_hole_event_horizon_blast('dishanhai:mk1_comsics')
    .outputFluids(['gtceu:magmatter 131072000','gtceu:spatialfluid 131072000','gtladditions:phonon_crystal_solution 131072000','gtceu:temporalfluid 131072000','gtceu:cosmicneutronium 131072000','gtceu:magnetohydrodynamicallyconstrainedstarmatter 131072000','gtladditions:phonon_medium 131072000','gtceu:chaos 131072000','gtceu:primordialmatter 131072000','gtceu:mana 131072000','gtceu:white_dwarf_mtter 131072000','gtceu:black_dwarf_mtter 131072000','gtceu:starlight 131072000','gtceu:instability 131072000','gtceu:infinity 131072000','gtceu:cosmic_element 131072000','gtceu:neutronium 131072000','gtceu:eternity 131072000','gtceu:miracle 131072000','gtceu:spacetime 131072000'])
    .itemInputs(['16x dishanhai:hxsp'])
    */


let assSuccess = 0;
let assFailed = 0;


assrecipes.forEach(function(recipe) {
    // 首先验证配方
    var validation = validateRecipe(recipe);
    if (!validation.valid) {
        console.error('❌ 配方验证失败: ' + recipe.id + ' (' + recipe.type + ') - ' + validation.error);
        broadcastRecipeError(recipe.type, `dishanhai:${recipe.id}`, validation.error);
        assFailed++;
        return;
    }
    
    try {
        safeAddRecipe(recipe.type, 'dishanhai:' + recipe.id, function() {
            buildRecipe(gtr[recipe.type]('dishanhai:' + recipe.id), recipe);
        });
        assSuccess++;
    } catch(err) {
        console.error(`❌ 配方执行失败: ${recipe.id} - ${err.message}`);
        broadcastRecipeError(recipe.type, `dishanhai:${recipe.id}`, err.message);
        assFailed++;
    }
});


// ========== 通用配方批处理 ==========
const universalRecipes = [
    { id: 'raw_photon_carrying_wafer', type: 'precision_laser_engraver', itemInputs: ['kubejs:rutherfordium_neutronium_wafer'], notConsumable: 'dishanhai:wzcz1', itemOutputs: ['kubejs:raw_photon_carrying_wafer'], circuit: 1, EUt: uhv, duration: 20 },
    { id: 'pm_wafer', type: 'precision_laser_engraver', itemInputs: ['kubejs:taranium_wafer'], notConsumable: 'dishanhai:wzcz1', itemOutputs: ['kubejs:pm_wafer'], circuit: 1, EUt: uhv, duration: 20 },
    { id: 'nm_wafer', type: 'precision_laser_engraver', itemInputs: ['kubejs:rutherfordium_neutronium_wafer'], notConsumable: 'dishanhai:wzcz1', itemOutputs: ['kubejs:nm_wafer'], circuit: 2, EUt: uhv, duration: 20 },
    { id: 'fm_wafer', type: 'precision_laser_engraver', itemInputs: ['kubejs:pm_wafer'], notConsumable: 'dishanhai:wzcz1', itemOutputs: ['kubejs:fm_wafer'], circuit: 1, EUt: uhv, duration: 20 },
    { id: 'prepared_cosmic_soc_wafer', type: 'precision_laser_engraver', itemInputs: ['kubejs:taranium_wafer'], notConsumable: 'dishanhai:wzcz1', itemOutputs: ['kubejs:prepared_cosmic_soc_wafer'], circuit: 2, EUt: uhv, duration: 20 },
    { id: 'high_precision_crystal_soc', type: 'precision_laser_engraver', itemInputs: ['gtceu:crystal_soc'], notConsumable: 'dishanhai:wzcz1', itemOutputs: ['kubejs:high_precision_crystal_soc'], circuit: 1, EUt: uhv, duration: 20 },
    { id: 'compressed_stone_dust', type: 'electric_implosion_compressor', itemInputs: ['1024x gtceu:stone_dust'], notConsumable: 'dishanhai:wzcz1', itemOutputs: ['gtceu:compressed_stone_dust'], EUt: uiv, duration: 20 },
    { id: 'chemical_reactor_polyethylene_oxygen', type: 'chemical_reactor', itemInputs: ['2x gtceu:carbon_dust'], inputFluids: ['minecraft:water 2000'], outputFluids: ['gtceu:oxygen 1500', 'gtceu:polyethylene 1500'], EUt: lv, duration: 20, notConsumable: 'dishanhai:wzcz1' },
    { id: 'distort_polyethylene_oxygen', type: 'distort', itemInputs: ['64x gtceu:carbon_dust'], inputFluids: ['minecraft:water 64000'], outputFluids: ['gtceu:oxygen 150000', 'gtceu:polyethylene 150000'], EUt: zpm, duration: 20, notConsumable: 'dishanhai:wzcz2', blastFurnaceTemp: 9000, circuit: 20 },
    { id: 'wzcz_bronze_ingot', type: 'assembler', itemInputs: ['minecraft:copper_ingot', 'gtceu:tin_ingot'], notConsumable: 'dishanhai:wzcz1', itemOutputs: ['gtceu:bronze_ingot'], EUt: lv, duration: 20 },
    { id: 'sulfuric_acid', type: 'chemical_reactor', itemInputs: ['gtceu:sulfur_dust'], inputFluids: ['minecraft:water 1000'], outputFluids: ['gtceu:sulfuric_acid 1000'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
    { id: 'assembler_dye_law_cleaning_gravity_configuration_maintenance_hatch',notConsumable:'32x dishanhai:wzcz1', type: 'assembler', itemInputs: ['gtceu:maintenance_hatch', 'minecraft:red_dye', 'minecraft:blue_dye'], itemOutputs: ['gtceu:law_cleaning_gravity_configuration_maintenance_hatch'], EUt: mv, duration: 20 },
    { id: 'all_exquisite_gems_output', type: 'laser_engraver', notConsumable: ['64x dishanhai:wzcz2', 'gtceu:glass_lens'],itemInputs: ['gtceu:silicon_dust'],circuit: 20,EUt: mv,duration: 20,dynamicOutputs: true},
    {id:'Dye_component_pack',type:'assembler',itemInputs: ['minecraft:dandelion'],dy_cell:true, EUt: ulv, duration: 20, defaultEnabled: false },
    // 测试占位符替换功能 - 使用不存在的物品ID，应被替换为'dishanhai:zwf'（已禁用，需要显式使用Item.safeOf）
    {id:'test_placeholder',type:'assembler',itemInputs: ['nonexistent:invalid_item', '2x another:missing_item'], itemOutputs: ['3x invalid:output_item'], defaultEnabled: false, EUt: ulv, duration: 20 },
    {id:'assembler_salt_water',type:'chemical_reactor',inputFluids: ['minecraft:water 1000'], outputFluids: ['gtceu:salt_water 1000'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
    {id:'assembler_module_gate_and_bridg',type:'assembler_module',itemInputs: ['512x dishanhai:wzcz2','16x gtceu:space_elevator','64x gtceu:resource_collection','64x gtceu:assembler_module','64x kubejs:space_drone_mk1','64x gtlcore:power_core','32x gtceu:chemical_distort','64x kubejs:bioware_assembly'], itemOutputs: ['dishanhai:gate_and_bridg'], EUt: uv, duration: 20,addDataid: "SEPMTier", addData: 2},

    // ========== 原初铸币工厂 — 机器配方 (山海体系 HV) ==========
    { id: 'coin_forge_machine', type: 'primordial_matter_recombination',
      itemInputs: ['1x dishanhai:wzsb', '16x dishanhai:wl_board_hv', '8x kubejs:hv_universal_circuit',
                   '64x dishanhai:photon', '64x dishanhai:first_light', '16x dishanhai:matter_singularity',
                   '16x dishanhai:worldline_residual_fragment', '4x dishanhai:navigate_prism',
                   '4x gtceu:hv_machine_hull', '4x gtceu:hv_robot_arm'],
      inputFluids: ['dishanhai:matter_fluid_virtual 64000', 'dishanhai:zero_point_energy 32000', 'dishanhai:light 128000'],
      itemOutputs: ['gt_shanhai:primordial_coin_forge'], EUt: hv, duration: 400, conditions: ["16x dishanhai:wzsb"] },

    // ========== 铸币: 64块→32币 (coin_forge) ==========
    { id: 'copper_coin_mint',      type: 'coin_forge', itemInputs: ['64x gtceu:copper_block'],      itemOutputs: ['32x dishanhai:copper_coin'],      EUt: hv, duration: 200 },
    { id: 'cupronickel_coin_mint', type: 'coin_forge', itemInputs: ['64x gtceu:cupronickel_block'], itemOutputs: ['32x dishanhai:cupronickel_coin'], EUt: hv, duration: 200 },
    { id: 'silver_coin_mint',      type: 'coin_forge', itemInputs: ['64x gtceu:silver_block'],      itemOutputs: ['32x dishanhai:silver_coin'],      EUt: hv, duration: 200 },
    { id: 'gold_coin_mint',        type: 'coin_forge', itemInputs: ['64x minecraft:gold_block'],    itemOutputs: ['32x dishanhai:gold_coin'],        EUt: hv, duration: 200 },
    { id: 'platinum_coin_mint',    type: 'coin_forge', itemInputs: ['64x gtceu:platinum_block'],    itemOutputs: ['32x dishanhai:platinum_coin'],    EUt: hv, duration: 200 },
    { id: 'osmium_coin_mint',      type: 'coin_forge', itemInputs: ['64x gtceu:osmium_block'],      itemOutputs: ['32x dishanhai:osmium_coin'],      EUt: hv, duration: 200 },
    { id: 'naquadah_coin_mint',    type: 'coin_forge', itemInputs: ['64x gtceu:naquadah_block'],    itemOutputs: ['32x dishanhai:naquadah_coin'],    EUt: hv, duration: 200 },
    { id: 'neutronium_coin_mint',  type: 'coin_forge', itemInputs: ['64x gtceu:neutronium_block'],  itemOutputs: ['32x dishanhai:neutronium_coin'],  EUt: hv, duration: 200 },
    { id: 'neutron_coin_mint',     type: 'coin_forge', itemInputs: ['64x gtceu:cosmicneutronium_block'], itemOutputs: ['32x dishanhai:neutron_coin'], EUt: hv, duration: 200 },
    { id: 'infinite_coin_mint',    type: 'coin_forge', itemInputs: ['64x avaritia:infinity_ingot'],    itemOutputs: ['32x dishanhai:infinite_coin'],    EUt: hv, duration: 200 },

    // ========== 特殊币兑换 (coin_forge) ==========
    { id: 'stupid_coin_from_copper',      type: 'coin_forge', itemInputs: ['dishanhai:copper_coin'],  itemOutputs: ['9x dishanhai:stupid_coin'],         EUt: hv, duration: 100 },
    { id: 'coin_secondary_from_infinite', type: 'coin_forge', itemInputs: ['9x dishanhai:infinite_coin'], itemOutputs: ['dishanhai:coin_secondary'],      EUt: hv, duration: 300 },
    { id: 'sadbapycat_token_from_coins',  type: 'coin_forge', itemInputs: ['8x dishanhai:coin_secondary','kubejs:giga_chad'], itemOutputs: ['dishanhai:sadbapycat_token'], EUt: hv, duration: 600 },

    // ========== 量子计算机 — IV级 (assembler) ==========
    { id: 'quantum_structure',           type: 'assembler', itemInputs: ['4x gtceu:tungsten_steel_frame','4x gtceu:quantum_eye','4x gtceu:iridium_plate','4x gtceu:naquadah_plate'], inputFluids: ['gtceu:soldering_alloy 576'], itemOutputs: ['4x gt_shanhai:quantum_structure'],           EUt: iv, duration: 200 },
    { id: 'quantum_computer_unit',       type: 'assembler', itemInputs: ['gtceu:advanced_computer_casing','4x ae2:engineering_processor','4x ae2:calculation_processor','4x ae2:logic_processor','2x ae2:crafting_unit','gtceu:quantum_processor_mainframe'], inputFluids: ['gtceu:soldering_alloy 288'], itemOutputs: ['gt_shanhai:quantum_computer_unit'],       EUt: iv, duration: 300 },
    { id: 'quantum_parallel_processor',  type: 'assembler', itemInputs: ['gtceu:advanced_computer_casing','8x ae2:engineering_processor','4x ae2:crafting_accelerator','2x gtceu:quantum_processor_mainframe','4x gtceu:quantum_eye'], inputFluids: ['gtceu:soldering_alloy 288'], itemOutputs: ['gt_shanhai:quantum_parallel_processor'],  EUt: iv, duration: 300 },
    { id: 'quantum_crafting_storage',    type: 'assembler', itemInputs: ['gtceu:advanced_computer_casing','8x ae2:calculation_processor','4x ae2:1k_crafting_storage','2x gtceu:quantum_processor_mainframe','4x gtceu:quantum_star'], inputFluids: ['gtceu:soldering_alloy 288'], itemOutputs: ['gt_shanhai:quantum_crafting_storage'],    EUt: iv, duration: 300 },
    { id: 'quantum_computer',            type: 'assembler', itemInputs: ['4x gt_shanhai:quantum_structure','gt_shanhai:quantum_computer_unit','gt_shanhai:quantum_parallel_processor','gt_shanhai:quantum_crafting_storage','4x gtceu:quantum_processor_mainframe','4x kubejs:entangled_singularity'], inputFluids: ['gtceu:soldering_alloy 1152'], itemOutputs: ['gt_shanhai:quantum_computer'],            EUt: iv, duration: 400 }

];


        

var sanitize = function(v) {
    if (v == null) return null;
    if (typeof v === 'string') return ['', 'null', 'undefined', 'none'].includes(v.trim()) ? null : v;
    if (typeof v === 'number') return (isNaN(v) || v <= 0) ? null : v;
    if (Array.isArray(v)) {
        var cleanedArr = v.map(sanitize).filter(function(x) { return x != null; });
        return cleanedArr.length ? cleanedArr : null;
    }
    return v;
};


var success = 0, fail = 0;
// 预热缓存
DShanhaiRecipeEngine.precache([assrecipes, universalRecipes]);

universalRecipes.forEach(function(recipe) {
    var validation = validateRecipe(recipe);
    if (!validation.valid) {
        console.error('❌ 配方验证失败: ' + recipe.id + ' (' + recipe.type + ') - ' + validation.error);
        broadcastRecipeError(recipe.type, recipe.id, validation.error);
        fail++;
        return;
    }
    
    var ok = safeAddRecipe(recipe);
    ok ? success++ : fail++;
});



e.shaped("gtceu:industrial_steam_casing", [
      'AAA',                                                                                                                                                                           
      'BCA',
      'DEF'
  ], {
      A: "gtceu:bronze_plate",
      B: "#forge:tools/hammers",
      C: "gtceu:bronze_frame",
      D: "gtceu:bronze_rotor",
      E: "gtceu:bronze_gear",
      F: "gtceu:bronze_rotor"
  });
e.shaped("gtceu:bronze_machine_casing", [
      'AAA',
      'BCA',
      'DEF'
  ], {
      A: "gtceu:bronze_plate",
      B: "gtceu:bronze_normal_fluid_pipe",
      C: "gtceu:bronze_frame",
      D: "gtlcore:primitive_fluid_regulator",
      E: "gtlcore:primitive_robot_arm",
      F: "gtceu:bronze_rotor"
  });

// ===== 批量有序合成配方模板 =====                                                                                                                               
  var RECIPES = [                                                                                                                                                
      // [输出物品, 数量, 形状数组, 映射表]
       [Item.of("gt_shanhai:ulv_zero_point_conversion", 1), ["EAD","BCB","CCC"],  {A:"gtceu:bronze_block", B:'#gtceu:circuits/ulv', C:"gtceu:bronze_machine_casing",D:"gtlcore:primitive_fluid_regulator",E:"gtlcore:primitive_robot_arm"}],
       [Item.of("gt_shanhai:ulv_photon_siphon", 1), ["EAD","BCB","CAC"],  {A:"gtceu:bronze_block", B:'#gtceu:circuits/ulv', C:"gtceu:bronze_machine_casing",D:"gtlcore:primitive_fluid_regulator",E:"gtlcore:primitive_robot_arm"}]
  ];

  RECIPES.forEach(function(r) {
      var output = r[0];
      var pattern, key;
      if (Array.isArray(r[1])) {
          pattern = r[1];
          key = r[2] || {};
      } else {
          pattern = r[2];
          key = r[3] || {};
      }

      e.shaped(output, pattern, key);
  })
function buildRecipe(m, r) { DShanhaiRecipeEngine.applyAll(m, r); }

// ========== 物质操纵模块 ==========
    var moduleRecipes = [
        { id: 'assembler_dandelion', type: 'assembler', itemInputs: ['minecraft:yellow_dye'], itemOutputs: ['minecraft:dandelion'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_annealed_copper_ingot', type: 'assembler', itemInputs: ['gtceu:copper_dust'], itemOutputs: ['gtceu:annealed_copper_ingot'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_red_alloy_dust', type: 'assembler', itemInputs: ['gtceu:copper_dust', '2x minecraft:redstone'], itemOutputs: ['gtceu:red_alloy_dust'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_ulv_universal_circuit', type: 'assembler', itemInputs: ['#gtceu:circuits/ulv'], itemOutputs: ['kubejs:ulv_universal_circuit'], notConsumable: 'dishanhai:wzcz1', circuit: 1, EUt: lv, duration: 20 },
        { id: 'assembler_ulv_universal_circuit_2', type: 'assembler', itemInputs: ['#gtceu:circuits/lv'], itemOutputs: ['16x kubejs:ulv_universal_circuit'], notConsumable: 'dishanhai:wzcz1', circuit: 2, EUt: lv, duration: 20 },
        { id: 'assembler_lv_universal_circuit', type: 'assembler', itemInputs: ['#gtceu:circuits/mv'], itemOutputs: ['16x kubejs:lv_universal_circuit'], notConsumable: 'dishanhai:wzcz1', circuit: 3, EUt: lv, duration: 20 },
        { id: 'assembler_mv_universal_circuit', type: 'assembler', itemInputs: ['#gtceu:circuits/hv'], itemOutputs: ['16x kubejs:mv_universal_circuit'], notConsumable: 'dishanhai:wzcz1', circuit: 4, EUt: lv, duration: 20 },
        { id: 'assembler_hv_universal_circuit', type: 'assembler', itemInputs: ['#gtceu:circuits/ev'], itemOutputs: ['16x kubejs:hv_universal_circuit'], notConsumable: 'dishanhai:wzcz1', circuit: 5, EUt: lv, duration: 20 },
        { id: 'assembler_ev_universal_circuit', type: 'assembler', itemInputs: ['#gtceu:circuits/iv'], itemOutputs: ['16x kubejs:ev_universal_circuit'], notConsumable: 'dishanhai:wzcz1', circuit: 6, EUt: lv, duration: 20 },
        { id: 'assembler_iv_universal_circuit', type: 'assembler', itemInputs: ['#gtceu:circuits/luv'], itemOutputs: ['16x kubejs:iv_universal_circuit'], notConsumable: 'dishanhai:wzcz1', circuit: 7, EUt: lv, duration: 20 },
        { id: 'assembler_luv_universal_circuit', type: 'assembler', itemInputs: ['#gtceu:circuits/zpm'], itemOutputs: ['16x kubejs:luv_universal_circuit'], notConsumable: 'dishanhai:wzcz1', circuit: 8, EUt: lv, duration: 20 },
        { id: 'assembler_gunpowder', type: 'assembler', itemInputs: ['minecraft:flint'], itemOutputs: ['minecraft:gunpowder'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_flint', type: 'assembler', itemInputs: ['minecraft:gravel'], itemOutputs: ['2x minecraft:flint'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_gravel', type: 'assembler', itemInputs: ['#forge:cobblestone'], itemOutputs: ['minecraft:gravel'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_oak_log', type: 'assembler', itemInputs: ['minecraft:oak_sapling'], itemOutputs: ['64x minecraft:oak_log', '16x minecraft:oak_sapling'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_iodine_dust', type: 'assembler', inputFluids: ['gtceu:salt_water 1000'], itemOutputs: ['gtceu:iodine_dust'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_iodine_dust_2', type: 'assembler', itemInputs: ['32x minecraft:kelp'], itemOutputs: ['gtceu:iodine_dust'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_slime_ball', type: 'assembler', itemInputs: ['minecraft:clay_ball'], itemOutputs: ['minecraft:slime_ball'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_sticky_resin', type: 'assembler', itemInputs: ['gtceu:rubber_sapling'], itemOutputs: ['64x gtceu:sticky_resin', '64x gtceu:rubber_log', '8x gtceu:rubber_sapling'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_bronze_dust', type: 'assembler', itemInputs: ['2x gtceu:tin_dust', 'gtceu:copper_dust'], itemOutputs: ['4x gtceu:bronze_dust'], notConsumable: 'dishanhai:wzcz1', EUt: ulv, duration: 20 },
        { id: 'assembler_tnt', type: 'assembler', itemInputs: ['ae2:tiny_tnt'], itemOutputs: ['minecraft:tnt'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
        { id: 'assembler_industrial_tnt', type: 'assembler', itemInputs: ['ae2:tiny_tnt'], itemOutputs: ['gtceu:industrial_tnt'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 }
    ];
    


//gt_shanhai模组配方批处理
let myRecipes = [
  // ===== ULV 级 (EUt: ulv) =====
  { id: 'zero_point_conversion_energy', type: 'zero_point_conversion', notConsumable: ['gtceu:lv_electric_pump', 'gtlcore:primitive_fluid_regulator'], inputFluids: ['minecraft:water 3000'], outputFluids: ['dishanhai:zero_point_energy 20'], EUt: ulv, duration: 20 },
  { id: 'photon_siphon_light_item_source', type: 'photon_siphon', notConsumable: ['gtceu:lv_electric_pump', 'gtlcore:primitive_fluid_regulator'], inputFluids: ['dishanhai:zero_point_energy 20'], itemOutputs: ['dishanhai:first_light'], EUt: ulv, duration: 20 },
  { id: 'photon_siphon_light_source', type: 'photon_siphon', notConsumable: ['gtceu:lv_electric_pump', 'gtlcore:primitive_fluid_regulator'], itemInputs: ['2x dishanhai:first_light'], outputFluids: ['dishanhai:light 2000'], EUt: ulv, duration: 20 },
  { id: 'circuit_assembly_wl_board_ulv', type: 'circuit_assembler', itemInputs: ['64x dishanhai:first_light', '8x #gtceu:circuits/ulv'], inputFluids: ['dishanhai:zero_point_energy 8000'], itemOutputs: ['4x dishanhai:wl_board_ulv'], EUt: ulv, duration: 20 },
  { id: 'chemical_bath_primordial_void_induction_armature', type: 'chemical_bath', itemInputs: ['64x gt_shanhai:primordial_omega_engine'], inputFluids: ['dishanhai:zero_point_energy 320000'], itemOutputs: ['gt_shanhai:primordial_void_induction_armature'], EUt: ulv, duration: 20 },
  { id: 'matter_forging_matter_ball_source', type: 'matter_forging', circuit: 1, itemInputs: ['256000x minecraft:cobblestone'], itemOutputs: ['3840x ae2:matter_ball'], EUt: ulv, duration: 20 },
  { id: 'matter_forging_singularity_source', type: 'matter_forging', circuit: 2, itemInputs: ['640x ae2:matter_ball'], itemOutputs: ['ae2:singularity'], EUt: ulv, duration: 20 },
  { id: 'matter_forging_matter_ball_destination', type: 'matter_forging', circuit: 3, inputFluids: ['minecraft:water 15360000'], itemOutputs: ['2560x ae2:matter_ball'], EUt: ulv, duration: 20 },
  { id: 'matter_forging_matter_singularity_source', type: 'matter_forging', circuit: 4, itemInputs: ['131002x ae2:matter_ball', '16x ae2:singularity'], inputFluids: ['dishanhai:zero_point_energy 1000'], itemOutputs: ['dishanhai:matter_singularity'], EUt: ulv, duration: 20 },
  { id: 'photon_separation_source', type: 'photon_separation', inputFluids: ['dishanhai:light 500'], itemOutputs: ['dishanhai:photon'], EUt: ulv, duration: 20 },
  { id: 'photon_separation_destination', type: 'photon_separation', inputFluids: ['dishanhai:zero_point_energy'], itemOutputs: ['2x dishanhai:first_light'], outputFluids: ['dishanhai:light 550'], EUt: ulv, duration: 20 },
  { id: 'matter_module_casting_wzrm_destination', type: 'matter_module_casting', itemInputs: [ '1312x dishanhai:first_light', '648x dishanhai:matter_singularity', '328x dishanhai:photon', '16x dishanhai:wl_board_ulv' ], inputFluids: ['dishanhai:matter_fluid_entry 10000'], itemOutputs: ['dishanhai:wzrm'], EUt: ulv, duration: 20 },
  { id: 'primordial_matter_recombination_wl_board_ulv', type: 'primordial_matter_recombination', notConsumable: [], itemInputs: ['64x dishanhai:first_light', '4x gtceu:nand_chip'], inputFluids: ['dishanhai:light 2000', 'dishanhai:matter_fluid_entry 2000'], itemOutputs: ['4x dishanhai:wl_board_ulv'], EUt: ulv, duration: 20 },
  // ===== LV 级 (EUt: 32) =====
  { id: 'assembler_maintenance_hatch', type: 'assembler', defaultEnabled: false, itemInputs: ['gt_shanhai:primordial_omega_engine'], inputFluids: ['dishanhai:light'], itemOutputs: ['gt_shanhai:maintenance_hatch'], EUt: 20, duration: lv },
  { id: 'super_parallel_core', type: 'assembler', defaultEnabled: false, itemInputs: ['gtceu:molecular_assembler_matrix'], inputFluids: ['dishanhai:light'], itemOutputs: ['gt_shanhai:super_parallel_core'], EUt: 20, duration: lv },
  { id: 'craft_primordial_matter_caster', type: 'assembler', itemInputs: [ '1x gt_shanhai:primordial_omega_engine', '25x gtceu:bronze_machine_casing', '100x dishanhai:first_light', '10x kubejs:ulv_universal_circuit' ], inputFluids: ['dishanhai:light 100000'], itemOutputs: ['1x gt_shanhai:primordial_matter_caster'], EUt: 32, duration: 200 },
  // ===== LV 机器升级配方 =====
  { id: 'assembler_lv_photon_siphon', type: 'assembler', itemInputs: [ '1x gt_shanhai:ulv_photon_siphon', '4x gtceu:solid_machine_casing', '8x #gtceu:circuits/lv', '4x gtceu:lv_electric_pump', '2x gtceu:lv_robot_arm' ], inputFluids: ['dishanhai:zero_point_energy 2000'], itemOutputs: ['1x gt_shanhai:lv_photon_siphon'], EUt: lv, duration: 400 },
  { id: 'assembler_lv_zero_point_conversion', type: 'assembler', itemInputs: [ '1x gt_shanhai:ulv_zero_point_conversion', '4x gtceu:solid_machine_casing', '8x #gtceu:circuits/lv', '4x gtceu:lv_electric_pump', '2x gtceu:lv_robot_arm' ], inputFluids: ['dishanhai:zero_point_energy 2000'], itemOutputs: ['1x gt_shanhai:lv_zero_point_conversion'], EUt: lv, duration: 400 },
  { id: 'circuit_assembly_wl_board_lv', type: 'circuit_assembler', itemInputs: [ '64x dishanhai:photon', '10x kubejs:lv_universal_circuit', '16x gtceu:conductive_alloy_single_wire', '128x gtceu:aluminium_foil' ], inputFluids: ['dishanhai:zero_point_energy 8000'], itemOutputs: ['1x dishanhai:wl_board_lv'], EUt: 32, duration: 200 },
  { id: 'matter_module_casting_wzjc', type: 'matter_module_casting', itemInputs: [ '1000x dishanhai:first_light', '1000x dishanhai:matter_singularity', '1000x dishanhai:photon', '32x dishanhai:wl_board_lv', '1x dishanhai:wzrm' ], inputFluids: ['dishanhai:matter_fluid_basic 20000'], itemOutputs: ['1x dishanhai:wzjc'], EUt: 32, duration: 200, conditions: ["4x dishanhai:wzrm"] },
  // ===== MV 级 (EUt: 128) =====
  { id: 'primordial_energy_absorption', type: 'primordial_energy_absorption', inputFluids: ['minecraft:water 3000'], outputFluids: ['dishanhai:zero_point_energy 1000'], EUt: mv, duration: 20 },
  { id: 'matter_module_casting_dimensional_worldline_fragment', type: 'matter_module_casting', itemInputs: [ '128x minecraft:ender_pearl', '1x gtceu:separated_plant', '1x gtceu:mixed_plant', '1x gtceu:assemble_plant', '1x gtceu:processing_plant', '4x gtceu:mv_energy_input_hatch_16a', '16x dishanhai:matter_singularity', '1024x dishanhai:photon' ], inputFluids: [ 'dishanhai:matter_fluid_entry 64000', 'dishanhai:matter_fluid_basic 32000', 'dishanhai:matter_fluid_foundation 16000' ], itemOutputs: ['1x dishanhai:dimensional_worldline_fragment'], EUt: 128, duration: 200, conditions: ["4x dishanhai:wzjc"] },
  { id: 'matter_module_casting_wzcz1', type: 'matter_module_casting', itemInputs: [ '4x dishanhai:dimensional_worldline_fragment', '1x dishanhai:wzjc', '32x dishanhai:wl_board_mv', '1024x dishanhai:photon', '1024x dishanhai:matter_singularity' ], inputFluids: [ 'dishanhai:matter_fluid_entry 64000', 'dishanhai:matter_fluid_basic 64000', 'dishanhai:matter_fluid_foundation 64000', 'dishanhai:light 1024000' ], itemOutputs: ['1x dishanhai:wzcz1'], EUt: 128, duration: 200, conditions: ["16x dishanhai:wzjc"] },
  { id: 'circuit_assembly_wl_board_mv', type: 'circuit_assembler', itemInputs: [ '64x dishanhai:photon', '12x kubejs:mv_universal_circuit', '16x gtceu:energetic_alloy_single_wire', '64x gtceu:ulpic_chip', '64x gtceu:ilc_chip', '64x gtceu:ram_chip' ], inputFluids: ['dishanhai:zero_point_energy 8000'], itemOutputs: ['1x dishanhai:wl_board_mv'], EUt: 128, duration: 200, circuit: 1 },
  { id: 'matter_module_casting_dark_energy_multiplier', type: 'matter_module_casting', itemInputs: [ '1x dishanhai:wzcz1', '16x dishanhai:dimensional_worldline_fragment', '4x gt_shanhai:primordial_void_induction_armature' ], inputFluids: [ 'dishanhai:zero_point_energy 1024000', 'dishanhai:light 1024000', 'dishanhai:matter_fluid_foundation 256000' ], itemOutputs: ['1x dishanhai:dark_energy_multiplier'], EUt: 128, duration: 200, conditions: ["4x dishanhai:wzcz1"] },
  // ===== MV 机器升级配方 =====
  { id: 'assembler_mv_photon_siphon', type: 'assembler', itemInputs: [ '1x gt_shanhai:lv_photon_siphon', '4x gtceu:solid_machine_casing', '8x #gtceu:circuits/mv', '4x gtceu:mv_electric_pump', '2x gtceu:mv_robot_arm' ], inputFluids: ['dishanhai:zero_point_energy 8000'], itemOutputs: ['1x gt_shanhai:mv_photon_siphon'], EUt: mv, duration: 400 },
  { id: 'assembler_mv_zero_point_conversion', type: 'assembler', itemInputs: [ '1x gt_shanhai:lv_zero_point_conversion', '4x gtceu:solid_machine_casing', '8x #gtceu:circuits/mv', '4x gtceu:mv_electric_pump', '2x gtceu:mv_robot_arm' ], inputFluids: ['dishanhai:zero_point_energy 8000'], itemOutputs: ['1x gt_shanhai:mv_zero_point_conversion'], EUt: mv, duration: 400 },
  // ===== HV 级 (EUt: 512) =====
  { id: 'interstellar_matter_absorption_cosmic_dust', type: 'interstellar_matter_absorption', itemInputs: ['1x minecraft:cobblestone'], itemOutputs: ['1x dishanhai:cosmic_dust'], EUt: 512, duration: 100, conditions: ["64x dishanhai:wzsb"] },
  { id: 'assembler_primordial_matter_recombinator_core', type: 'assembler', itemInputs: [ "64x dishanhai:wzrm", '1024x dishanhai:wl_board_hv', '512x dishanhai:wl_board_lv', '256x dishanhai:wl_board_ulv', '131002x gtceu:industrial_steam_casing', '131002x gtceu:bronze_machine_casing' ], inputFluids: ['dishanhai:light 1031022'], itemOutputs: ['gt_shanhai:primordial_matter_recombinator_core'], EUt: hv, duration: 20 },
  { id: 'circuit_assembly_wem_1', type: 'circuit_assembler', itemInputs: [ '64x kubejs:iv_universal_circuit', '1x dishanhai:wzrm', '1x dishanhai:wzjc', '1x dishanhai:wzcz1', '1x dishanhai:wzxc' ], inputFluids: ['dishanhai:light 32000'], itemOutputs: ['1x dishanhai:wem_1'], EUt: 512, duration: 200, circuit: 1 },
  { id: 'circuit_assembly_wl_board_hv', type: 'circuit_assembler', itemInputs: [ '14x kubejs:hv_universal_circuit', '64x dishanhai:photon', '64x gtceu:smd_capacitor', '64x gtceu:smd_diode', '64x gtceu:lpic_chip', '64x gtceu:smd_resistor' ], inputFluids: ['dishanhai:zero_point_energy 8000'], itemOutputs: ['1x dishanhai:wl_board_hv'], EUt: 512, duration: 200, circuit: 1 },
  { id: 'matter_module_casting_worldline_residual_fragment', type: 'matter_module_casting', itemInputs: [ '64x dishanhai:wzrm', '32x dishanhai:matter_singularity', '4x gtceu:cleaning_maintenance_hatch', '1x gtceu:vacuum_freezer', '1x gtceu:fishing_ground', '4x gtceu:hv_energy_input_hatch_16a', '1x gtceu:cracker', '1x gtceu:distillation_tower', '2048x dishanhai:photon' ], inputFluids: [ 'dishanhai:matter_fluid_basic 32000', 'dishanhai:matter_fluid_virtual 8000', 'dishanhai:matter_fluid_foundation 16000' ], itemOutputs: ['1x dishanhai:worldline_residual_fragment'], EUt: 512, duration: 200, conditions: ["4x dishanhai:wzcz1"] },
  { id: 'matter_module_casting_wzxc', type: 'matter_module_casting', itemInputs: [ '4x dishanhai:worldline_residual_fragment', '1x dishanhai:wzcz1', '32x dishanhai:wl_board_hv', '1024x dishanhai:photon', '1024x dishanhai:matter_singularity' ], inputFluids: [ 'dishanhai:matter_fluid_virtual 64000', 'dishanhai:matter_fluid_basic 64000', 'dishanhai:matter_fluid_foundation 64000', 'dishanhai:light 1024000' ], itemOutputs: ['1x dishanhai:wzxc'], EUt: 512, duration: 200, conditions: ["16x dishanhai:wzcz1"] },
  { id: 'primordial_matter_recombination_wl_board_lv_x4', type: 'primordial_matter_recombination', itemInputs: ['64x dishanhai:first_light', '4x kubejs:lv_universal_circuit'], inputFluids: ['dishanhai:light 2000', 'dishanhai:matter_fluid_basic 2000'], itemOutputs: ['4x dishanhai:wl_board_lv'], EUt: 512, duration: 200, conditions: ["16x dishanhai:wzxc"] },
  { id: 'primordial_matter_recombination_wl_board_mv_x4', type: 'primordial_matter_recombination', itemInputs: ['64x dishanhai:first_light', '4x kubejs:mv_universal_circuit'], inputFluids: ['dishanhai:light 2000', 'dishanhai:matter_fluid_foundation 2000'], itemOutputs: ['4x dishanhai:wl_board_mv'], EUt: 512, duration: 200, conditions: ["16x dishanhai:wzxc"] },
  { id: 'primordial_matter_recombination_wl_board_hv_x4', type: 'primordial_matter_recombination', itemInputs: ['64x dishanhai:first_light', '4x kubejs:hv_universal_circuit'], inputFluids: ['dishanhai:light 2000', 'dishanhai:matter_fluid_virtual 2000'], itemOutputs: ['4x dishanhai:wl_board_hv'], EUt: 512, duration: 200, conditions: ["16x dishanhai:wzxc"] },
  { id: 'primordial_matter_recombination_zero_photon_condenser', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:wem_1', '32x gtceu:nichrome_coil_block', '4x gtceu:ev_machine_hull', '1x gtceu:large_chemical_reactor', '64x gtceu:hv_emitter', '64x gtceu:hv_sensor' ], inputFluids: ['dishanhai:zero_point_energy 32000'], itemOutputs: ['1x gt_shanhai:zero_photon_condenser'], EUt: 512, duration: 200, conditions: ["4x dishanhai:wzxc"] },
  { id: 'primordial_matter_recombination_chaotic_furnace', type: 'primordial_matter_recombination', itemInputs: [ '4x gtceu:hv_macerator', '4x gtceu:hv_sifter', '4x gtceu:hv_centrifuge', '4x gtceu:hv_thermal_centrifuge', '4x gtceu:hv_chemical_bath', '4x dishanhai:worldline_residual_fragment', '1x dishanhai:wem_1', '1x gt_shanhai:primordial_omega_engine' ], inputFluids: ['dishanhai:matter_fluid_virtual 64000'], itemOutputs: ['1x gt_shanhai:primordial_chaotic_ephemeral_deconstruction_crystallization_furnace'], EUt: 512, duration: 200, conditions: ["4x dishanhai:wzxc"] },
  { id: 'primordial_matter_recombination_world_fragments_collector', type: 'primordial_matter_recombination', itemInputs: [ '4x gtceu:ulv_fragment_world_collection_machine', '1x gt_shanhai:primordial_omega_engine', '1x dishanhai:wem_1', '4x dishanhai:worldline_residual_fragment' ], inputFluids: ['dishanhai:matter_fluid_virtual 64000'], itemOutputs: ['1x gt_shanhai:primordial_world_fragments_collector'], EUt: 512, duration: 200, conditions: ["4x dishanhai:wzxc"] },
  // ===== EV 级 (EUt: 2048) =====
  { id: 'matter_forging_cosmic_dust', type: 'matter_forging', circuit: 5, itemInputs: ['1x dishanhai:matter_singularity', '64x dishanhai:photon'], inputFluids: ['dishanhai:light 64000', 'dishanhai:zero_point_energy 64000'], itemOutputs: ['1x dishanhai:cosmic_dust'], EUt: 2048, duration: 200, conditions: ["4x dishanhai:wzxc"] },
  { id: 'matter_module_casting_wzsb', type: 'matter_module_casting', itemInputs: [ '16x dishanhai:worldline_residual_fragment', '1x dishanhai:wem_1', '32x dishanhai:wl_board_ev', '1024x dishanhai:cosmic_dust', '1x dishanhai:primordial_parallel_particle', '4x dishanhai:primordial_worldline_seed' ], inputFluids: [ 'dishanhai:matter_fluid_virtual 64000', 'dishanhai:matter_fluid_transmutation 64000', 'dishanhai:matter_fluid_foundation 64000' ], itemOutputs: ['1x dishanhai:wzsb'], EUt: 2048, duration: 200, conditions: ["16x dishanhai:wzxc"] },
  { id: 'primordial_matter_recombination_wl_board_ev_x4', type: 'primordial_matter_recombination', itemInputs: ['64x dishanhai:first_light', '4x kubejs:ev_universal_circuit'], inputFluids: ['dishanhai:light 2000', 'dishanhai:matter_fluid_transmutation 2000'], itemOutputs: ['4x dishanhai:wl_board_ev'], EUt: 2048, duration: 200, conditions: ["4x dishanhai:wzxc"] },
  { id: 'primordial_matter_recombination_thread_shard_1', type: 'primordial_matter_recombination', itemInputs: [ '1x gt_shanhai:divergence_engine', '1x dishanhai:primordial_worldline_seed', '32x dishanhai:cosmic_dust' ], itemOutputs: ['1x dishanhai:thread_shard_1'], EUt: 2048, duration: 200, conditions: ["4x dishanhai:wzsb"] },
  { id: 'primordial_matter_recombination_divergence_engine', type: 'primordial_matter_recombination', itemInputs: [ '4x gtceu:iv_machine_hull', '16x gtceu:ev_emitter', '16x gtceu:ev_sensor', '1x dishanhai:primordial_worldline_seed', '64x dishanhai:cosmic_dust', '32x dishanhai:worldline_residual_fragment' ], inputFluids: ['dishanhai:matter_fluid_transmutation 64000', 'dishanhai:zero_point_energy 1024000'], itemOutputs: ['1x gt_shanhai:divergence_engine'], EUt: 2048, duration: 200, conditions: ["4x dishanhai:wzsb"] },
  { id: 'primordial_matter_recombination_primordial_worldline_seed', type: 'primordial_matter_recombination', itemInputs: ['64x dishanhai:cosmic_dust', '16x dishanhai:wl_board_ev', '4x dishanhai:primordial_parallel_particle'], inputFluids: ['dishanhai:matter_fluid_transmutation 64000'], itemOutputs: ['1x dishanhai:primordial_worldline_seed'], EUt: 2048, duration: 200, conditions: ["4x dishanhai:wzsb"] },
  { id: 'primordial_matter_recombination_primordial_parallel_particle', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:wem_1', '16x dishanhai:dimensional_worldline_fragment', '4x dishanhai:worldline_residual_fragment', '32x dishanhai:cosmic_dust' ], inputFluids: [ 'dishanhai:matter_fluid_transmutation 16000', 'dishanhai:matter_fluid_virtual 32000', 'dishanhai:matter_fluid_foundation 64000' ], itemOutputs: ['1x dishanhai:primordial_parallel_particle'], EUt: 2048, duration: 200, conditions: ["16x dishanhai:wzsb"] },
  { id: 'primordial_matter_recombination_primordial_divergence_generator', type: 'primordial_matter_recombination', itemInputs: [ '16x gt_shanhai:divergence_engine', '32x dishanhai:primordial_worldline_seed', '128x dishanhai:primordial_parallel_particle', '1x gt_shanhai:primordial_omega_engine' ], itemOutputs: ['1x gt_shanhai:primordial_divergence_generator'], EUt: 2048, duration: 200, conditions: ["16x dishanhai:wzsb"] },
  { id: 'primordial_matter_recombination_causal_weaving_matrix', type: 'primordial_matter_recombination', itemInputs: [ '16x dishanhai:worldline_divergent_core', '1x dishanhai:wzsb', '4x gt_shanhai:divergence_engine', '64x dishanhai:navigate_prism', '256x dishanhai:cosmic_dust' ], inputFluids: ['dishanhai:matter_fluid_transmutation 128000', 'dishanhai:causal_essence 32000'], itemOutputs: ['1x gt_shanhai:primordial_causal_weaving_matrix'], EUt: 2048, duration: 200, conditions: ["16x dishanhai:wzsb"] },
  { id: 'primordial_causal_weaving_collapse_tear', type: 'primordial_causal_weaving', itemInputs: [ '4096x dishanhai:cosmic_dust', '1024x dishanhai:worldline_residual_fragment', '256x dishanhai:primordial_parallel_particle', '1024x dishanhai:photon' ], inputFluids: ['dishanhai:matter_fluid_transmutation 5120000', 'dishanhai:primal_chaos 2048000'], itemOutputs: ['1x dishanhai:collapse_tear'], EUt: 2048, duration: 600, conditions: ["64x dishanhai:wzsb"] },
  // ===== IV 级 (EUt: 8192) =====
  { id: 'matter_module_casting_wzax', type: 'matter_module_casting', itemInputs: [ '4x dishanhai:worldline_divergent_core', '1x dishanhai:wzsb', '32x dishanhai:wl_board_iv', '1024x dishanhai:cosmic_dust', '1024x dishanhai:navigate_prism', '16x dishanhai:worldline_residual_fragment' ], inputFluids: [ 'dishanhai:matter_fluid_virtual 64000', 'dishanhai:matter_fluid_transmutation 64000', 'dishanhai:matter_fluid_darkstar 64000' ], itemOutputs: ['1x dishanhai:wzax'], EUt: 8192, duration: 200, conditions: ["16x dishanhai:wzsb"] },
  { id: 'photon_separation_primordial_divergence_heart', type: 'photon_separation', notConsumable: ['1x gt_shanhai:divergence_engine'], itemInputs: ['4x dishanhai:primordial_worldline_seed'], inputFluids: ['dishanhai:light 1024000', 'dishanhai:zero_point_energy 1024000'], itemOutputs: ['32x dishanhai:primordial_divergence_heart'], EUt: 8192, duration: 200, conditions: ["16x dishanhai:wzsb"] },
  { id: 'photon_separation_navigate_prism', type: 'photon_separation', itemInputs: ['1x dishanhai:cosmic_dust'], itemOutputs: ['4x dishanhai:navigate_prism', '32x dishanhai:first_light'], EUt: 8192, duration: 200, conditions: ["64x dishanhai:wzsb"] },
  { id: 'matter_module_casting_worldline_divergent_core_v2', type: 'matter_module_casting', itemInputs: [ '32x dishanhai:cosmic_dust', '16x dishanhai:primordial_divergence_heart', '1x gtceu:assembly_line', '1x gtceu:fission_reactor', '1x gtceu:cold_ice_freezer', '1x gtceu:blaze_blast_furnace', '4x gtceu:iv_energy_input_hatch_16a', '64x dishanhai:navigate_prism' ], inputFluids: [ 'dishanhai:matter_fluid_transmutation 16000', 'dishanhai:matter_fluid_darkstar 8000', 'dishanhai:matter_fluid_virtual 32000' ], itemOutputs: ['1x dishanhai:worldline_divergent_core'], EUt: 8192, duration: 200, conditions: ["4x dishanhai:wzsb"] },
  { id: 'primordial_matter_recombination_wl_board_iv_x4', type: 'primordial_matter_recombination', itemInputs: ['4x dishanhai:cosmic_dust', '4x kubejs:iv_universal_circuit'], inputFluids: ['dishanhai:matter_fluid_darkstar 2000'], itemOutputs: ['4x dishanhai:wl_board_iv'], EUt: 8192, duration: 200, conditions: ["4x dishanhai:wzsb"] },
  { id: 'primordial_matter_recombination_assembly_line_module', type: 'primordial_matter_recombination', itemInputs: [ '64x gtceu:assembly_line', '1x dishanhai:wzax', '16x dishanhai:worldline_divergent_core', '64x dishanhai:cosmic_dust', '64x dishanhai:navigate_prism' ], inputFluids: ['dishanhai:matter_fluid_darkstar 64000'], itemOutputs: ['1x gt_shanhai:primordial_assembly_line_module'], EUt: 8192, duration: 200, conditions: ["16x dishanhai:wzax"] },
  { id: 'primordial_matter_recombination_anti_entropy_core', type: 'primordial_matter_recombination', itemInputs: [ '64x gtceu:cold_ice_freezer', '16x dishanhai:worldline_divergent_core', '64x dishanhai:navigate_prism', '64x dishanhai:cosmic_dust', '1x dishanhai:wzax' ], inputFluids: ['dishanhai:matter_fluid_darkstar 64000'], itemOutputs: ['1x gt_shanhai:primordial_anti_entropy_condensation_core'], EUt: 8192, duration: 200, conditions: ["16x dishanhai:wzax"] },
  { id: 'primordial_matter_recombination_nebula_siphon', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:wem_1', '32x gtceu:iv_machine_hull', '64x dishanhai:navigate_prism', '64x dishanhai:cosmic_dust', '16x gtceu:iv_emitter', '16x gtceu:iv_sensor' ], inputFluids: ['dishanhai:matter_fluid_darkstar 64000', 'dishanhai:zero_point_energy 256000'], itemOutputs: ['1x gt_shanhai:nebula_siphon'], EUt: 8192, duration: 200, conditions: ["16x dishanhai:wzax"] },
  // ===== LuV 级 (EUt: 32768) =====
  { id: 'primordial_matter_recombination_wl_board_luv_x4', type: 'primordial_matter_recombination', itemInputs: ['4x dishanhai:navigate_prism', '4x kubejs:luv_universal_circuit'], inputFluids: ['dishanhai:matter_fluid_advanced 2000'], itemOutputs: ['4x dishanhai:wl_board_luv'], EUt: 32768, duration: 200, conditions: ["4x dishanhai:wzax"] },
  { id: 'matter_module_casting_nova_catalyst', type: 'matter_module_casting', itemInputs: [ '16x gtceu:iv_256a_laser_target_hatch', '1x gtceu:luv_compressed_fusion_reactor', '1x gtceu:research_station', '1x gtceu:precision_assembler', '1x gtceu:neutron_activator', '4x dishanhai:dimensional_worldline_fragment', '64x dishanhai:navigate_prism', '128x dishanhai:cosmic_dust', '4x dishanhai:wem_1' ], inputFluids: [ 'dishanhai:matter_fluid_advanced 8000', 'dishanhai:matter_fluid_darkstar 16000', 'dishanhai:matter_fluid_transmutation 32000' ], itemOutputs: ['1x dishanhai:nova_catalyst'], EUt: 32768, duration: 200, conditions: ["4x dishanhai:wzax"] },
  { id: 'primordial_matter_recombination_thread_shard_2', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:thread_shard_1', '2x gt_shanhai:divergence_engine', '1x dishanhai:worldline_divergent_core', '64x dishanhai:navigate_prism', '32x dishanhai:wl_board_luv' ], itemOutputs: ['1x dishanhai:thread_shard_2'], EUt: 32768, duration: 200, conditions: ["4x dishanhai:wzcz2"] },
  { id: 'matter_module_casting_wzcz2_luv', type: 'matter_module_casting', itemInputs: [ '16x dishanhai:worldline_divergent_core', '1x dishanhai:wzax', '32x dishanhai:wl_board_luv', '1024x dishanhai:cosmic_dust', '1024x dishanhai:navigate_prism', '64x dishanhai:worldline_residual_fragment', '4x dishanhai:nova_catalyst' ], inputFluids: [ 'dishanhai:matter_fluid_advanced 64000', 'dishanhai:matter_fluid_transmutation 64000', 'dishanhai:matter_fluid_darkstar 64000' ], itemOutputs: ['1x dishanhai:wzcz2'], EUt: 32768, duration: 200, conditions: ["16x dishanhai:wzax"], },
  { id: 'primordial_causal_weaving_bridge_and_gate', type: 'primordial_causal_weaving', itemInputs: [ '1024x dishanhai:worldline_divergent_core', '64x dishanhai:wl_board_luv', '4096x dishanhai:navigate_prism', '1024x dishanhai:photon' ], inputFluids: ['dishanhai:matter_fluid_advanced 5120000', 'dishanhai:dimensional_fabric 2048000'], itemOutputs: ['1x dishanhai:bridge_and_gate'], EUt: 32768, duration: 600, conditions: ["64x dishanhai:wzax"] },
  // ===== ZPM 级 (EUt: 131072) =====
  { id: 'primordial_matter_recombination_wl_board_zpm_x4', type: 'primordial_matter_recombination', itemInputs: ['4x dishanhai:light_voyage', '4x kubejs:zpm_universal_circuit'], inputFluids: ['dishanhai:matter_fluid_transition 2000'], itemOutputs: ['4x dishanhai:wl_board_zpm'], EUt: 131072, duration: 200, conditions: ["4x dishanhai:wzcz2"] },
  { id: 'matter_forging_light_voyage', type: 'matter_forging', itemInputs: [ '4096x dishanhai:navigate_prism', '1024x dishanhai:primordial_divergence_heart', '1x dishanhai:nova_catalyst' ], inputFluids: ['dishanhai:zero_point_energy 256000', 'dishanhai:light 256000'], itemOutputs: ['1024x dishanhai:light_voyage'], EUt: 131072, duration: 200, conditions: ["32x dishanhai:wzcz2"] },
  { id: 'matter_module_casting_primordial_biological_core_zpm', type: 'primordial_matter_recombination', itemInputs: [ '64x gtceu:large_greenhouse', '1x dishanhai:wem_2', '16x dishanhai:nova_catalyst', '64x dishanhai:light_voyage', '64x dishanhai:navigate_prism', '32x dishanhai:worldline_divergent_core', '64x gtceu:large_incubator' ], inputFluids: ['dishanhai:matter_fluid_transition 64000'], itemOutputs: ['1x gt_shanhai:primordial_biological_core'], EUt: 131072, duration: 200, conditions: ["16x dishanhai:wzqs"] },
  { id: 'primordial_matter_recombination_thread_shard_3', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:thread_shard_2', '4x gt_shanhai:divergence_engine', '1x dishanhai:nova_catalyst', '64x dishanhai:light_voyage', '32x dishanhai:wl_board_zpm' ], itemOutputs: ['1x dishanhai:thread_shard_3'], EUt: 131072, duration: 200, conditions: ["4x dishanhai:wzqs"] },
  { id: 'matter_module_casting_wzqs', type: 'matter_module_casting', itemInputs: [ '32x dishanhai:worldline_divergent_core', '1x dishanhai:wzcz2', '32x dishanhai:wl_board_zpm', '1024x dishanhai:light_voyage', '1024x dishanhai:navigate_prism', '128x dishanhai:worldline_residual_fragment', '8x dishanhai:nova_catalyst', '256x dishanhai:dimensional_worldline_fragment' ], inputFluids: [ 'dishanhai:matter_fluid_advanced 64000', 'dishanhai:matter_fluid_transition 64000', 'dishanhai:matter_fluid_darkstar 64000' ], itemOutputs: ['1x dishanhai:wzqs'], EUt: 131072, duration: 200, conditions: ["16x dishanhai:wzcz2"], },
  { id: 'primordial_matter_recombination_wem_2', type: 'primordial_matter_recombination', itemInputs: [ '64x dishanhai:wl_board_zpm', '1x dishanhai:wzsb', '1x dishanhai:wzax', '1x dishanhai:wzcz2', '512x dishanhai:photon', '64x dishanhai:light_voyage', '128x dishanhai:navigate_prism', '256x dishanhai:cosmic_dust', '1x dishanhai:wzqs' ], itemOutputs: ['1x dishanhai:wem_2'], EUt: 131072, duration: 200, conditions: ["64x dishanhai:wzqs"] },
  // ===== UV 级 (EUt: uv) =====
  { id: 'primordial_matter_recombination_wl_board_uv_x4', type: 'primordial_matter_recombination', itemInputs: ['8x dishanhai:light_voyage', '4x kubejs:uv_universal_circuit'], inputFluids: ['dishanhai:matter_fluid_zero 2000'], itemOutputs: ['4x dishanhai:wl_board_uv'], EUt: uv, duration: 200, conditions: ["4x dishanhai:wzqs"], circuit: 1 },
  { id: 'primordial_matter_recombination_primordial_engraving_module', type: 'primordial_matter_recombination', itemInputs: [ '64x gtceu:large_engraving_laser', '1x dishanhai:wzgl', '32x dishanhai:nova_catalyst', '128x dishanhai:light_voyage', '256x dishanhai:navigate_prism', '16x dishanhai:worldline_boundless_singularity', '16x gtceu:engraving_laser_plant' ], inputFluids: ['dishanhai:matter_fluid_zero 64000'], itemOutputs: ['1x gt_shanhai:primordial_engraving_module'], EUt: uv, duration: 200, conditions: ["16x dishanhai:wzgl"], circuit: 2 },
  { id: 'matter_module_casting_wzgl', type: 'matter_module_casting', itemInputs: [ '64x dishanhai:worldline_divergent_core', '1x dishanhai:wem_2', '32x dishanhai:wl_board_uv', '1024x dishanhai:light_voyage', '1024x dishanhai:navigate_prism', '256x dishanhai:worldline_residual_fragment', '16x dishanhai:nova_catalyst', '8x dishanhai:worldline_boundless_singularity' ], inputFluids: [ 'dishanhai:matter_fluid_advanced 64000', 'dishanhai:matter_fluid_transition 64000', 'dishanhai:matter_fluid_zero 64000' ], itemOutputs: ['1x dishanhai:wzgl'], EUt: uv, duration: 200, conditions: ["64x dishanhai:wzqs"], },
  { id: 'primordial_matter_recombination_worldline_boundless_singularity', type: 'matter_module_casting', itemInputs: [ '16x gtceu:uv_16384a_laser_target_hatch', '16x gtceu:me_extended_export_buffer', '16x gtceu:gravity_hatch', '4x dishanhai:thread_shard_3', '32x dishanhai:light_voyage', '64x dishanhai:primordial_divergence_heart', '64x dishanhai:navigate_prism', '128x dishanhai:cosmic_dust', '1x dishanhai:wem_2', '1x gtceu:chemical_distort', '1x gtceu:space_elevator', '1x gtceu:uv_fusion_reactor', '1x gtceu:large_naquadah_reactor' ], inputFluids: [ 'dishanhai:matter_fluid_zero 8000', 'dishanhai:matter_fluid_transition 16000', 'dishanhai:matter_fluid_advanced 32000' ], itemOutputs: ['4x dishanhai:worldline_boundless_singularity'], EUt: uv, duration: 200, conditions: ["4x dishanhai:wzqs"] },
  { id: 'primordial_causal_weaving_gate_and_bridg', type: 'primordial_causal_weaving', itemInputs: [ '1024x dishanhai:worldline_divergent_core', '64x dishanhai:wl_board_uv', '4096x dishanhai:light_voyage', '1024x dishanhai:genesis_shard' ], inputFluids: ['dishanhai:matter_fluid_zero 5120000', 'dishanhai:dimensional_fabric 4096000'], itemOutputs: ['1x dishanhai:gate_and_bridg'], EUt: uv, duration: 600, conditions: ["64x dishanhai:wzqs"] },
  { id: 'primordial_matter_recombination_integrated_assembly_matrix', type: 'primordial_matter_recombination', itemInputs: [ '16x gtceu:uv_machine_hull', '4x kubejs:uv_universal_circuit', '64x dishanhai:light_voyage', '64x dishanhai:navigate_prism', '16x gtceu:uv_robot_arm', '16x gtceu:uv_conveyor_module' ], inputFluids: ['dishanhai:matter_fluid_zero 64000'], itemOutputs: ['1x gt_shanhai:integrated_assembly_matrix'], EUt: uv, duration: 200, conditions: ["16x dishanhai:wzgl"], circuit: 3 },
  { id: 'primordial_matter_recombination_integrated_assembly_facility', type: 'primordial_matter_recombination', itemInputs: [ '32x gtceu:uv_machine_hull', '8x kubejs:uv_universal_circuit', '128x dishanhai:light_voyage', '64x dishanhai:genesis_shard', '32x gtceu:uv_robot_arm', '32x gtceu:uv_emitter', '1x dishanhai:worldline_boundless_singularity' ], inputFluids: ['dishanhai:matter_fluid_zero 128000'], itemOutputs: ['1x gt_shanhai:integrated_assembly_facility'], EUt: uv, duration: 200, conditions: ["32x dishanhai:wzgl"], circuit: 4 },
  { id: 'primordial_matter_recombination_singularity_data_hub', type: 'primordial_matter_recombination', itemInputs: [ '16x gtceu:uv_machine_hull', '8x kubejs:uv_universal_circuit', '64x dishanhai:light_voyage', '64x dishanhai:navigate_prism', '16x gtceu:uv_sensor', '16x gtceu:uv_emitter', '1x dishanhai:worldline_boundless_singularity' ], inputFluids: ['dishanhai:matter_fluid_zero 64000'], itemOutputs: ['1x gt_shanhai:singularity_data_hub'], EUt: uv, duration: 200, conditions: ["16x dishanhai:wzgl"], circuit: 5 },
  { id: 'primordial_matter_recombination_space_scaler', type: 'primordial_matter_recombination', itemInputs: [ '16x gtceu:uv_machine_hull', '4x kubejs:uv_universal_circuit', '64x dishanhai:light_voyage', '32x dishanhai:genesis_shard', '16x gtceu:uv_field_generator', '1x dishanhai:worldline_imaginary_string' ], inputFluids: ['dishanhai:matter_fluid_zero 64000', 'gtceu:spacetime 32000'], itemOutputs: ['1x gt_shanhai:space_scaler'], EUt: uv, duration: 200, conditions: ["16x dishanhai:wzgl"], circuit: 6 },
  { id: 'assembler_casing_quantum_glass', type: 'assembler', itemInputs: [ '64x gtceu:fusion_glass', '4x kubejs:uv_universal_circuit', '16x dishanhai:light_voyage' ], inputFluids: ['dishanhai:matter_fluid_zero 32000'], itemOutputs: ['64x gt_shanhai:casing_quantum_glass'], EUt: uv, duration: 200, circuit: 7 },
  { id: 'assembler_casing_rhenium', type: 'assembler', itemInputs: [ '32x gtceu:uv_machine_hull', '16x gtceu:rhenium_plate', '8x dishanhai:light_voyage' ], inputFluids: ['dishanhai:matter_fluid_zero 32000'], itemOutputs: ['32x gt_shanhai:casing_rhenium'], EUt: uv, duration: 200, circuit: 8 },
  { id: 'assembler_casing_transcendent', type: 'assembler', itemInputs: [ '64x gtceu:uv_machine_hull', '16x dishanhai:genesis_shard', '16x dishanhai:light_voyage' ], inputFluids: ['dishanhai:matter_fluid_zero 64000'], itemOutputs: ['64x gt_shanhai:casing_transcendent'], EUt: uv, duration: 200, circuit: 9 },
  { id: 'assembler_casing_molecular', type: 'assembler', itemInputs: [ '64x gtceu:uv_machine_hull', '16x dishanhai:light_voyage', '16x dishanhai:genesis_shard' ], inputFluids: ['dishanhai:matter_fluid_zero 64000'], itemOutputs: ['64x gt_shanhai:casing_molecular'], EUt: uv, duration: 200, circuit: 10 },
  { id: 'assembler_casing_assembly', type: 'assembler', itemInputs: [ '32x gtceu:assembly_line_casing', '8x kubejs:uv_universal_circuit', '16x dishanhai:light_voyage' ], inputFluids: ['dishanhai:matter_fluid_zero 32000'], itemOutputs: ['32x gt_shanhai:casing_assembly'], EUt: uv, duration: 200, circuit: 11 },
  // ===== UHV 级 (EUt: uhv) =====
  { id: 'primordial_matter_recombination_wl_board_uhv_x4', type: 'primordial_matter_recombination', itemInputs: ['2x dishanhai:genesis_shard', '4x kubejs:uhv_universal_circuit'], inputFluids: ['dishanhai:matter_fluid_zero 4000'], itemOutputs: ['4x dishanhai:wl_board_uhv'], EUt: uhv, duration: 200, conditions: ["4x dishanhai:wzgl"] },
  { id: 'matter_module_casting_wzhy', type: 'matter_module_casting', itemInputs: [ '128x dishanhai:worldline_divergent_core', '1x dishanhai:wzgl', '32x dishanhai:wl_board_uhv', '1024x dishanhai:genesis_shard', '1024x dishanhai:light_voyage', '512x dishanhai:worldline_residual_fragment', '32x dishanhai:nova_catalyst', '16x dishanhai:worldline_boundless_singularity', '8x dishanhai:worldline_imaginary_string' ], inputFluids: [ 'dishanhai:matter_fluid_zero 128000', 'dishanhai:matter_fluid_transition 128000', 'dishanhai:matter_fluid_peak 64000' ], itemOutputs: ['1x dishanhai:wzhy'], EUt: uhv, duration: 200, conditions: ["64x dishanhai:wzgl"], },
  { id: 'primordial_matter_recombination_wem_3', type: 'primordial_matter_recombination', itemInputs: [ '64x dishanhai:wl_board_uxv', '1x dishanhai:wzgl', '1x dishanhai:wzhy', '1x dishanhai:wzsw', '1x dishanhai:wzcx', '1x dishanhai:wzdf', '1024x dishanhai:photon', '128x dishanhai:genesis_shard', '128x dishanhai:light_voyage', '256x dishanhai:navigate_prism', '512x dishanhai:cosmic_dust' ], itemOutputs: ['1x dishanhai:wem_3'], EUt: uxv, duration: 200, conditions: ["64x dishanhai:wzdf"] },
  // ===== UHV 级 (EUt: uhv) — 基础材料光子分离 =====
  { id: 'photon_separation_genesis_shard', type: 'photon_separation', notConsumable: ['1x dishanhai:worldline_imaginary_string'], itemInputs: ['32768x dishanhai:cosmic_dust'], inputFluids: ['dishanhai:matter_fluid_zero 64000', 'dishanhai:zero_point_energy 32768000'], itemOutputs: ['256x dishanhai:genesis_shard'], EUt: uhv, duration: 200, conditions: ["64x dishanhai:wzgl"] },
  { id: 'matter_module_casting_worldline_imaginary_string', type: 'matter_module_casting', itemInputs: [ '128x dishanhai:dimensional_worldline_fragment', '1x dishanhai:worldline_boundless_singularity', '128x dishanhai:worldline_residual_fragment', '64x dishanhai:light_voyage', '64x dishanhai:primordial_divergence_heart', '4x dishanhai:wzqs', '64x kubejs:naquadria_charge', '1x gtceu:stellar_forge', '1x gtceu:uhv_fusion_reactor', '1x gtceu:suprachronal_assembly_line', '1x gtceu:matter_fabricator', '64x gtceu:max_battery', '64x gtceu:uhv_16384a_laser_target_hatch' ], inputFluids: [ 'dishanhai:matter_fluid_zero 16000', 'dishanhai:matter_fluid_transition 32000', 'dishanhai:matter_fluid_advanced 64000' ], itemOutputs: ['2x dishanhai:worldline_imaginary_string'], EUt: uhv, duration: 200, conditions: ["4x dishanhai:wzgl"] },
  { id: 'primordial_matter_recombination_thread_shard_4', type: 'primordial_matter_recombination', itemInputs: [ '2x dishanhai:thread_shard_3', '1x dishanhai:worldline_boundless_singularity', '1x dishanhai:worldline_imaginary_string', '128x dishanhai:genesis_shard', '32x dishanhai:wl_board_uhv' ], itemOutputs: ['2x dishanhai:thread_shard_4'], EUt: uhv, duration: 200, conditions: ["16x dishanhai:wzgl"] },
  { id: 'primordial_matter_recombination_taixu_smelting_furnace', type: 'primordial_matter_recombination', itemInputs: [ '64x gtceu:super_blast_smelter', '2x dishanhai:wzgl', '32x dishanhai:nova_catalyst', '256x dishanhai:light_voyage', '256x dishanhai:genesis_shard', '16x dishanhai:worldline_boundless_singularity', '8x dishanhai:worldline_imaginary_string' ], inputFluids: ['dishanhai:matter_fluid_zero 128000'], itemOutputs: ['1x gt_shanhai:taixu_smelting_furnace'], EUt: uhv, duration: 200, conditions: ["16x dishanhai:wzgl"] },
  // ===== UEV 级 (EUt: uev) =====
  { id: 'taixu_smelting_cobblestone_to_taixu_dust', type: 'taixu_smelting', itemInputs: ['1x minecraft:cobblestone'], itemOutputs: ['1x dishanhai:taixu_dust'], EUt: uev, duration: 100 },
  { id: 'photon_separation_star_spark', type: 'photon_separation', itemInputs: [ '64x dishanhai:light_voyage', '16x dishanhai:genesis_shard', '256x dishanhai:navigate_prism' ], inputFluids: ['dishanhai:light 2048000', 'dishanhai:matter_fluid_ascension 64000'], itemOutputs: ['16x dishanhai:star_spark'], EUt: uev, duration: 200, conditions: ["32x dishanhai:wzhy"] },
  { id: 'primordial_matter_recombination_wl_board_uev_x4', type: 'primordial_matter_recombination', itemInputs: ['64x dishanhai:star_spark', '4x kubejs:uev_universal_circuit'], inputFluids: ['dishanhai:matter_fluid_ascension 4000'], itemOutputs: ['4x dishanhai:wl_board_uev'], EUt: uev, duration: 200, conditions: ["4x dishanhai:wzhy"] },
  { id: 'primordial_matter_recombination_thread_shard_5', type: 'primordial_matter_recombination', itemInputs: [ '2x dishanhai:thread_shard_4', '8x gt_shanhai:divergence_engine', '1x dishanhai:worldline_genesis_embryo', '1x dishanhai:worldline_imaginary_string', '128x dishanhai:genesis_shard', '32x dishanhai:wl_board_uev' ], itemOutputs: ['1x dishanhai:thread_shard_5'], EUt: uev, duration: 200, conditions: ["16x dishanhai:wzhy"] },
  { id: 'matter_module_casting_wzsw', type: 'matter_module_casting', itemInputs: [ '128x dishanhai:worldline_divergent_core', '1x dishanhai:wzhy', '32x dishanhai:wl_board_uev', '1024x dishanhai:genesis_shard', '1024x dishanhai:star_spark', '512x dishanhai:worldline_residual_fragment', '32x dishanhai:nova_catalyst', '16x dishanhai:worldline_boundless_singularity', '8x dishanhai:worldline_genesis_embryo' ], inputFluids: [ 'dishanhai:matter_fluid_peak 128000', 'dishanhai:matter_fluid_transition 128000', 'dishanhai:matter_fluid_ascension 64000' ], itemOutputs: ['1x dishanhai:wzsw'], EUt: uev, duration: 200, conditions: ["64x dishanhai:wzhy"], },
  { id: 'matter_forging_gravitational_medium', type: 'matter_forging', itemInputs: ['1x gtceu:spacetime_ingot', '64x dishanhai:cosmic_dust'], inputFluids: ['dishanhai:matter_fluid_ascension 64000', 'dishanhai:light 320000'], itemOutputs: ['64x dishanhai:gravitational_medium'], EUt: uev, duration: 200, conditions: ["16x dishanhai:wzhy"] },
  { id: 'taixu_smelting_crystal_core', type: 'taixu_smelting', itemInputs: ['64x dishanhai:taixu_dust', '16x dishanhai:gravitational_medium'], inputFluids: ['dishanhai:matter_fluid_ascension 64000'], itemOutputs: ['4x dishanhai:taixu_crystal_core'], EUt: uev, duration: 200, conditions: ["4x dishanhai:wzhy"] },
  { id: 'taixu_smelting_liquid_droplet', type: 'taixu_smelting', itemInputs: ['16x dishanhai:taixu_dust', '4x dishanhai:taixu_crystal_core'], inputFluids: ['dishanhai:matter_fluid_ascension 32000'], itemOutputs: ['64x dishanhai:taixu_liquid_droplet'], EUt: uev, duration: 200, conditions: ["4x dishanhai:wzhy"] },
  { id: 'primordial_matter_recombination_gravitational_antenna', type: 'primordial_matter_recombination', itemInputs: [ '16x dishanhai:gravitational_medium', '4x gtceu:uev_field_generator', '16x dishanhai:wl_board_uev', '64x dishanhai:star_spark' ], inputFluids: ['dishanhai:matter_fluid_ascension 64000'], itemOutputs: ['4x dishanhai:gravitational_antenna'], EUt: uev, duration: 200, conditions: ["4x dishanhai:wzhy"] },
  { id: 'primordial_matter_recombination_gravitational_vibration_string', type: 'primordial_matter_recombination', itemInputs: [ '4x dishanhai:gravitational_antenna', '16x dishanhai:gravitational_medium', '8x dishanhai:worldline_divergent_core', '64x dishanhai:star_spark' ], inputFluids: ['dishanhai:matter_fluid_ascension 128000'], itemOutputs: ['1x dishanhai:gravitational_vibration_string'], EUt: uev, duration: 200, conditions: ["16x dishanhai:wzhy"] },
  { id: 'primordial_matter_recombination_artificial_neutron_star', type: 'primordial_matter_recombination', itemInputs: [ '4x dishanhai:gravitational_vibration_string', '16x dishanhai:gravitational_antenna', '64x dishanhai:gravitational_medium', '1x dishanhai:worldline_boundless_singularity' ], inputFluids: ['dishanhai:matter_fluid_ascension 256000'], itemOutputs: ['1x dishanhai:artificial_neutron_star'], EUt: uev, duration: 200, conditions: ["32x dishanhai:wzhy"] },
  { id: 'primordial_matter_recombination_super_pa', type: 'primordial_matter_recombination', itemInputs: [ '4x dishanhai:gravitational_antenna', '16x dishanhai:wl_board_uev', '32x dishanhai:star_spark' ], inputFluids: ['dishanhai:matter_fluid_ascension 128000', 'dishanhai:zero_point_energy 256000'], itemOutputs: ['1x gt_shanhai:super_pa'], EUt: uev, duration: 200, conditions: ["16x dishanhai:wzhy"] },
  // ===== 引力波天线发射器 =====
  { id: 'primordial_matter_recombination_gravitational_wave_antenna_transmitter', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:gravitational_lens', '4x dishanhai:gravitational_vibration_string', '16x dishanhai:gravitational_antenna', '64x dishanhai:star_spark', '16x dishanhai:wl_board_uev', '8x dishanhai:worldline_divergent_core', '4x dishanhai:worldline_imaginary_string' ], inputFluids: ['dishanhai:matter_fluid_ascension 256000', 'dishanhai:zero_point_energy 1024000'], itemOutputs: ['1x gt_shanhai:gravitational_wave_antenna_transmitter'], EUt: uev, duration: 400, conditions: ["32x dishanhai:wzhy"] },
  // ===== UIV 级 (EUt: uiv) =====
  { id: 'primordial_matter_recombination_wl_board_uiv_x4', type: 'primordial_matter_recombination', itemInputs: ['64x dishanhai:star_spark', '4x kubejs:uiv_universal_circuit'], inputFluids: ['dishanhai:matter_fluid_transcend 4000'], itemOutputs: ['4x dishanhai:wl_board_uiv'], EUt: uiv, duration: 200, conditions: ["4x dishanhai:wzsw"] },
  { id: 'primordial_matter_recombination_thread_shard_6', type: 'primordial_matter_recombination', itemInputs: [ '2x dishanhai:thread_shard_5', '16x gt_shanhai:divergence_engine', '1x dishanhai:worldline_genesis_embryo', '1x dishanhai:worldline_boundless_singularity', '256x dishanhai:genesis_shard', '32x dishanhai:wl_board_uiv' ], itemOutputs: ['1x dishanhai:thread_shard_6'], EUt: uiv, duration: 200, conditions: ["16x dishanhai:wzsw"] },
  { id: 'matter_module_casting_wzcx', type: 'matter_module_casting', itemInputs: [ '128x dishanhai:worldline_divergent_core', '1x dishanhai:wzsw', '32x dishanhai:wl_board_uiv', '1024x dishanhai:genesis_shard', '1024x dishanhai:star_spark', '512x dishanhai:worldline_residual_fragment', '32x dishanhai:nova_catalyst', '16x dishanhai:worldline_genesis_embryo', '8x dishanhai:worldline_imaginary_string' ], inputFluids: [ 'dishanhai:matter_fluid_ascension 128000', 'dishanhai:matter_fluid_peak 128000', 'dishanhai:matter_fluid_transcend 64000' ], itemOutputs: ['1x dishanhai:wzcx'], EUt: uiv, duration: 200, conditions: ["64x dishanhai:wzsw"], },
  { id: 'matter_forging_dimensional_fabric', type: 'matter_forging', itemInputs: ['32x dishanhai:dimensional_worldline_fragment', '128x dishanhai:worldline_residual_fragment'], inputFluids: ['dishanhai:matter_fluid_transcend 128000'], outputFluids: ['dishanhai:dimensional_fabric 64000'], EUt: uiv, duration: 200, conditions: ["16x dishanhai:wzsw"] },
  { id: 'matter_forging_dimensional_matrix', type: 'matter_forging', itemInputs: ['16x dishanhai:dimensional_worldline_fragment', '64x dishanhai:worldline_residual_fragment'], inputFluids: ['dishanhai:matter_fluid_transcend 64000', 'dishanhai:dimensional_fabric 32000'], itemOutputs: ['4x dishanhai:dimensional_matrix'], EUt: uiv, duration: 200, conditions: ["16x dishanhai:wzsw"] },
  { id: 'primordial_matter_recombination_dimensional_frame', type: 'primordial_matter_recombination', itemInputs: [ '8x dishanhai:dimensional_matrix', '4x dishanhai:worldline_divergent_core', '16x dishanhai:wl_board_uiv', '64x dishanhai:star_spark' ], inputFluids: ['dishanhai:matter_fluid_transcend 128000', 'dishanhai:dimensional_fabric 64000'], itemOutputs: ['1x dishanhai:dimensional_frame'], EUt: uiv, duration: 200, conditions: ["16x dishanhai:wzsw"] },
  { id: 'matter_module_casting_genesis_embryo', type: 'matter_module_casting', itemInputs: [ '4x dishanhai:dimensional_frame', '1x dishanhai:worldline_boundless_singularity', '1x dishanhai:worldline_imaginary_string', '64x dishanhai:genesis_shard' ], inputFluids: ['dishanhai:matter_fluid_transcend 256000', 'dishanhai:causal_essence 128000'], itemOutputs: ['1x dishanhai:worldline_genesis_embryo'], EUt: uiv, duration: 200, conditions: ["32x dishanhai:wzsw"] },
  // ===== UXV 级 (EUt: uxv) =====
  { id: 'primordial_matter_recombination_wl_board_uxv_x4', type: 'primordial_matter_recombination', itemInputs: ['64x dishanhai:star_spark', '4x kubejs:uxv_universal_circuit'], inputFluids: ['dishanhai:primal_chaos 4000'], itemOutputs: ['4x dishanhai:wl_board_uxv'], EUt: uxv, duration: 200, conditions: ["4x dishanhai:wzcx"] },
  { id: 'matter_module_casting_wzdf', type: 'matter_module_casting', itemInputs: [ '128x dishanhai:worldline_divergent_core', '1x dishanhai:wzcx', '32x dishanhai:wl_board_uxv', '1024x dishanhai:genesis_shard', '1024x dishanhai:star_spark', '512x dishanhai:worldline_residual_fragment', '32x dishanhai:nova_catalyst', '16x dishanhai:worldline_genesis_embryo', '8x dishanhai:worldline_boundless_singularity' ], inputFluids: [ 'dishanhai:matter_fluid_transcend 128000', 'dishanhai:matter_fluid_ascension 128000', 'dishanhai:primal_chaos 64000' ], itemOutputs: ['1x dishanhai:wzdf'], EUt: uxv, duration: 200, conditions: ["64x dishanhai:wzcx"], },
  { id: 'primordial_matter_recombination_wem_4', type: 'primordial_matter_recombination', itemInputs: [ '64x dishanhai:wl_board_eternal', '1x dishanhai:wzyh', '1x dishanhai:wzcz3', '1024x dishanhai:photon', '256x dishanhai:genesis_shard', '256x dishanhai:light_voyage', '512x dishanhai:navigate_prism', '1024x dishanhai:cosmic_dust' ], itemOutputs: ['1x dishanhai:wem_4'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzcz3"] },
  { id: 'primordial_matter_recombination_gravitational_lens', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:artificial_neutron_star', '4x dishanhai:gravitational_vibration_string', '16x dishanhai:gravitational_antenna', '64x dishanhai:star_spark' ], inputFluids: ['dishanhai:primal_chaos 256000'], itemOutputs: ['1x dishanhai:gravitational_lens'], EUt: uxv, duration: 200, conditions: ["32x dishanhai:wzcx"] },
  { id: 'taixu_smelting_ideal_ashes', type: 'taixu_smelting', itemInputs: ['64x dishanhai:taixu_dust', '16x dishanhai:taixu_crystal_core'], inputFluids: ['dishanhai:primal_chaos 64000'], itemOutputs: ['16x dishanhai:ideal_ashes'], EUt: uxv, duration: 200, conditions: ["16x dishanhai:wzcx"] },
  { id: 'taixu_smelting_beyond_taixu_thread', type: 'taixu_smelting', itemInputs: ['32x dishanhai:ideal_ashes', '4x dishanhai:worldline_divergent_core'], inputFluids: ['dishanhai:primal_chaos 128000'], itemOutputs: ['1x dishanhai:beyond_taixu_thread'], EUt: uxv, duration: 200, conditions: ["32x dishanhai:wzcx"] },
  { id: 'matter_forging_causal_essence', type: 'matter_forging', itemInputs: ['8x dishanhai:beyond_taixu_thread', '16x dishanhai:worldline_divergent_core'], inputFluids: ['dishanhai:primal_chaos 128000'], outputFluids: ['dishanhai:causal_essence 64000'], EUt: uxv, duration: 200, conditions: ["16x dishanhai:wzcx"] },
  { id: 'primordial_matter_recombination_strong_interaction_droplet', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:artificial_neutron_star', '16x dishanhai:gravitational_vibration_string', '4x dishanhai:singularity_ring', '64x dishanhai:star_spark' ], inputFluids: ['dishanhai:primal_chaos 256000', 'dishanhai:stabilized_eternity 128000'], itemOutputs: ['1x dishanhai:strong_interaction_droplet'], EUt: uxv, duration: 200, conditions: ["32x dishanhai:wzcx"] },
  // ===== OpV 级 (EUt: opv) =====
  { id: 'photon_separation_blue_son', type: 'photon_separation', itemInputs: [ '64x dishanhai:star_spark', '32x dishanhai:genesis_shard', '4x dishanhai:worldline_genesis_embryo' ], inputFluids: ['dishanhai:light 4096000', 'dishanhai:matter_fluid_eternal 64000'], itemOutputs: ['4x dishanhai:blue_son'], EUt: opv, duration: 200, conditions: ["32x dishanhai:wzdf"] },
  { id: 'primordial_matter_recombination_wl_board_opv_x4', type: 'primordial_matter_recombination', itemInputs: ['32x dishanhai:blue_son', '4x kubejs:opv_universal_circuit'], inputFluids: ['dishanhai:matter_fluid_eternal 4000'], itemOutputs: ['4x dishanhai:wl_board_opv'], EUt: opv, duration: 200, conditions: ["4x dishanhai:wzdf"] },
  { id: 'primordial_matter_recombination_thread_shard_7', type: 'primordial_matter_recombination', itemInputs: [ '2x dishanhai:thread_shard_6', '32x gt_shanhai:divergence_engine', '1x dishanhai:worldline_genesis_embryo', '1x dishanhai:worldline_boundless_singularity', '512x dishanhai:genesis_shard', '32x dishanhai:wl_board_opv' ], itemOutputs: ['1x dishanhai:thread_shard_7'], EUt: opv, duration: 200, conditions: ["16x dishanhai:wzcx"] },
  { id: 'matter_module_casting_wzyh', type: 'matter_module_casting', itemInputs: [ '128x dishanhai:worldline_divergent_core', '1x dishanhai:wzdf', '32x dishanhai:wl_board_opv', '1024x dishanhai:genesis_shard', '1024x dishanhai:blue_son', '512x dishanhai:worldline_residual_fragment', '32x dishanhai:nova_catalyst', '16x dishanhai:worldline_genesis_embryo', '8x dishanhai:worldline_imaginary_string' ], inputFluids: [ 'dishanhai:primal_chaos 128000', 'dishanhai:matter_fluid_transcend 128000', 'dishanhai:matter_fluid_eternal 64000' ], itemOutputs: ['1x dishanhai:wzyh'], EUt: opv, duration: 200, conditions: ["64x dishanhai:wzdf"], },
  { id: 'primordial_matter_recombination_singularity_ring', type: 'primordial_matter_recombination', itemInputs: [ '4x dishanhai:artificial_neutron_star', '1x dishanhai:gravitational_lens', '16x dishanhai:wl_board_opv', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_eternal 256000', 'dishanhai:stabilized_eternity 64000'], itemOutputs: ['4x dishanhai:singularity_ring'], EUt: opv, duration: 200, conditions: ["16x dishanhai:wzdf"] },
  { id: 'primordial_matter_recombination_annihilation_core', type: 'primordial_matter_recombination', itemInputs: [ '4x dishanhai:singularity_ring', '1x dishanhai:worldline_genesis_embryo', '32x dishanhai:wl_board_opv', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_eternal 512000', 'dishanhai:primal_chaos 256000'], itemOutputs: ['1x dishanhai:annihilation_core'], EUt: opv, duration: 200, conditions: ["32x dishanhai:wzdf"] },
  { id: 'primordial_matter_recombination_wanxiang_core', type: 'primordial_matter_recombination', itemInputs: [ '4x dishanhai:singularity_ring', '1x dishanhai:worldline_genesis_embryo', '16x dishanhai:wl_board_opv', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_eternal 256000', 'dishanhai:causal_essence 128000'], itemOutputs: ['1x dishanhai:wanxiang_core'], EUt: opv, duration: 200, conditions: ["32x dishanhai:wzdf"] },
  { id: 'matter_forging_stabilized_eternity', type: 'matter_forging', itemInputs: ['16x dishanhai:ideal_ashes', '1x dishanhai:finality_certificate'], inputFluids: ['dishanhai:matter_fluid_eternal 256000', 'dishanhai:primal_chaos 256000'], outputFluids: ['dishanhai:stabilized_eternity 64000'], EUt: opv, duration: 200, conditions: ["32x dishanhai:wzdf"] },
  { id: 'matter_forging_finality_certificate', type: 'matter_forging', itemInputs: ['64x dishanhai:ideal_ashes', '16x dishanhai:beyond_taixu_thread', '1x dishanhai:worldline_genesis_embryo'], inputFluids: ['dishanhai:matter_fluid_eternal 256000', 'dishanhai:stabilized_eternity 128000'], itemOutputs: ['1x dishanhai:finality_certificate'], EUt: opv, duration: 200, conditions: ["32x dishanhai:wzdf"] },
  { id: 'matter_forging_liquid_ending', type: 'matter_forging', notConsumable: ['1x dishanhai:finality_certificate'], itemInputs: ['64x dishanhai:ideal_ashes', '16x dishanhai:beyond_taixu_thread'], inputFluids: ['dishanhai:matter_fluid_eternal 256000'], outputFluids: ['dishanhai:liquid_ending 64000'], EUt: opv, duration: 200, conditions: ["32x dishanhai:wzdf"] },
  { id: 'primordial_matter_recombination_halo_end', type: 'primordial_matter_recombination', notConsumable: ['4x dishanhai:singularity_ring'], itemInputs: [ '1x dishanhai:finality_certificate', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:liquid_ending 64000'], itemOutputs: ['1x dishanhai:halo_end'], EUt: opv, duration: 200, conditions: ["32x dishanhai:wzdf"] },
  // ===== MAX 级 (EUt: MAX) =====
    { id: 'primordial_matter_recombination_apocalyptic_torsion_quantum_matrix', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:annihilation_core', '1x dishanhai:reality_core', '1x dishanhai:universal_parallel_overdriver', '1x gt_shanhai:spacetime_wave_matrix', '4x dishanhai:singularity_ring', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '16x dishanhai:finality_certificate', '64x dishanhai:beyond_taixu_thread' ], inputFluids: ['dishanhai:matter_fluid_ultimate 1024000', 'dishanhai:stabilized_eternity 512000', 'dishanhai:causal_essence 512000'], itemOutputs: ['1x gtladditions:apocalyptic_torsion_quantum_matrix'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_wl_board_max_x4', type: 'primordial_matter_recombination', itemInputs: ['32x dishanhai:blue_son', '4x kubejs:max_universal_circuit'], inputFluids: ['dishanhai:matter_fluid_ultimate 4000'], itemOutputs: ['4x dishanhai:wl_board_max'], EUt: MAX, duration: 200, conditions: ["4x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_wl_board_eternal', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:wl_board_max', '1x dishanhai:worldline_genesis_embryo', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 64000'], itemOutputs: ['1x dishanhai:wl_board_eternal'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'matter_module_casting_wzcz3', type: 'matter_module_casting', itemInputs: [ '256x dishanhai:worldline_divergent_core', '1x dishanhai:wzyh', '32x dishanhai:wl_board_max', '1024x dishanhai:genesis_shard', '1024x dishanhai:blue_son', '512x dishanhai:worldline_residual_fragment', '64x dishanhai:nova_catalyst', '32x dishanhai:worldline_genesis_embryo', '16x dishanhai:worldline_boundless_singularity', '8x dishanhai:worldline_imaginary_string' ], inputFluids: [ 'dishanhai:matter_fluid_eternal 128000', 'dishanhai:primal_chaos 128000', 'dishanhai:matter_fluid_ultimate 64000' ], itemOutputs: ['1x dishanhai:wzcz3'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"], },
  { id: 'matter_module_casting_reality_anchor_module', type: 'matter_module_casting', itemInputs: [ '1x dishanhai:wzcz3', '1x dishanhai:worldline_genesis_embryo', '1x dishanhai:universal_parallel_overdriver', '32x dishanhai:wl_board_eternal', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'dishanhai:stabilized_eternity 256000', 'dishanhai:causal_essence 256000'], itemOutputs: ['1x dishanhai:reality_anchor_module'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'matter_module_casting_create_mk', type: 'matter_module_casting', itemInputs: [ '1x dishanhai:reality_anchor_module', '1x dishanhai:reality_core', '1x dishanhai:annihilation_core', '1x dishanhai:universal_parallel_overdriver', '1x dishanhai:ku_ming_yuan_yang', '1x gt_shanhai:spacetime_wave_matrix', '1x dishanhai:halo_end', '1x dishanhai:collapse_tear', '1x dishanhai:bridge_and_gate', '1x dishanhai:gate_and_bridg', '1x dishanhai:csj', '1x dishanhai:big_tear', '48x dishanhai:wl_board_eternal', '8x dishanhai:singularity_ring', '32x dishanhai:finality_certificate', '128x dishanhai:blue_son' ], inputFluids: [ 'dishanhai:matter_fluid_ultimate 2048000', 'dishanhai:stabilized_eternity 1024000', 'dishanhai:primal_chaos 1024000', 'dishanhai:causal_essence 1024000' ], itemOutputs: ['1x dishanhai:create_mk'], EUt: MAX, duration: 400 },
  { id: 'primordial_matter_recombination_spacetime_wave_matrix', type: 'primordial_matter_recombination', itemInputs: [ '64x gtceu:spacetime_ingot', '4x dishanhai:singularity_ring', '1x dishanhai:annihilation_core', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '16x dishanhai:finality_certificate' ], inputFluids: ['dishanhai:matter_fluid_ultimate 1024000', 'gtceu:spacetime 1024000', 'dishanhai:stabilized_eternity 256000', 'dishanhai:causal_essence 256000'], itemOutputs: ['1x gt_shanhai:spacetime_wave_matrix'], EUt: MAX, duration: 400 },
  { id: 'primordial_causal_weaving_big_tear', type: 'primordial_causal_weaving', itemInputs: [ '1024x dishanhai:worldline_genesis_embryo', '64x dishanhai:wl_board_max', '4096x dishanhai:blue_son', '1024x dishanhai:genesis_shard' ], inputFluids: ['dishanhai:matter_fluid_ultimate 10240000', 'dishanhai:primal_chaos 10240000'], itemOutputs: ['1x dishanhai:big_tear'], EUt: MAX, duration: 600, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_causal_weaving_csj', type: 'primordial_causal_weaving', itemInputs: [ '1x dishanhai:big_tear', '1x dishanhai:collapse_tear', '1x dishanhai:bridge_and_gate', '1x dishanhai:gate_and_bridg', '64x dishanhai:wl_board_eternal', '4096x dishanhai:blue_son', '1024x dishanhai:finality_certificate' ], inputFluids: ['dishanhai:matter_fluid_ultimate 20480000', 'dishanhai:stabilized_eternity 10240000', 'dishanhai:primal_chaos 10240000'], itemOutputs: ['1x dishanhai:csj'], EUt: MAX, duration: 600, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_causal_weaving_fishbig_shards', type: 'primordial_causal_weaving', itemInputs: [ '1x dishanhai:csj', '1x dishanhai:big_tear', '1x dishanhai:halo_end', '64x dishanhai:wl_board_eternal', '4096x dishanhai:blue_son', '1024x dishanhai:finality_certificate' ], inputFluids: ['dishanhai:matter_fluid_ultimate 10240000', 'dishanhai:liquid_ending 5120000'], itemOutputs: ['1x dishanhai:fishbig_shards'], EUt: MAX, duration: 600, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_causal_weaving_piggy', type: 'primordial_causal_weaving', itemInputs: [ '1x dishanhai:fishbig_shards', '1x dishanhai:csj', '1x dishanhai:universal_parallel_overdriver', '64x dishanhai:wl_board_eternal', '4096x dishanhai:blue_son', '1024x dishanhai:finality_certificate' ], inputFluids: ['dishanhai:matter_fluid_ultimate 20480000', 'dishanhai:stabilized_eternity 10240000', 'dishanhai:causal_essence 5120000'], itemOutputs: ['1x dishanhai:piggy'], EUt: MAX, duration: 600, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_reality_core', type: 'primordial_matter_recombination', itemInputs: [ '4x dishanhai:dimensional_frame', '1x dishanhai:worldline_genesis_embryo', '16x dishanhai:singularity_ring', '1x dishanhai:annihilation_core', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 256000', 'dishanhai:stabilized_eternity 128000'], itemOutputs: ['1x dishanhai:reality_core'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_universal_parallel_core', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:reality_core', '16x dishanhai:wl_board_max', '4x dishanhai:thread_shard_7', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 256000'], itemOutputs: ['1x dishanhai:universal_parallel_core'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_judgment_limiter', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:universal_parallel_core', '16x dishanhai:wl_board_eternal', '4x dishanhai:thread_shard_7', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 256000', 'dishanhai:causal_essence 128000'], itemOutputs: ['1x dishanhai:judgment_limiter'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_prologue_of_the_end', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:judgment_limiter', '1x dishanhai:worldline_genesis_embryo', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'dishanhai:stabilized_eternity 256000'], itemOutputs: ['1x dishanhai:prologue_of_the_end'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_universal_parallel_overdriver', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:universal_parallel_core', '1x dishanhai:judgment_limiter', '1x dishanhai:prologue_of_the_end', '1x dishanhai:reality_core', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 1024000', 'dishanhai:stabilized_eternity 512000', 'dishanhai:causal_essence 512000'], itemOutputs: ['1x dishanhai:universal_parallel_overdriver'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_soc', type: 'primordial_matter_recombination', notConsumable: ['dishanhai:wzcz3'], itemInputs: [ '1x kubejs:prepared_cosmic_soc_wafer', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:stabilized_eternity 128000'], itemOutputs: ['1x dishanhai:soc'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_seventy_two_changes', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:wanxiang_core', '1x dishanhai:reality_core', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 256000', 'dishanhai:causal_essence 256000'], itemOutputs: ['1x gt_shanhai:seventy_two_changes'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_world_line_stripping_oscillation_generator', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:universal_parallel_overdriver', '4x dishanhai:thread_shard_7', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'dishanhai:causal_essence 256000'], itemOutputs: ['1x gt_shanhai:world_line_stripping_oscillation_generator'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_maintenance_hatch_max', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:reality_core', '4x dishanhai:singularity_ring', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'dishanhai:stabilized_eternity 256000'], itemOutputs: ['1x gt_shanhai:maintenance_hatch'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_primordial_engine_core', type: 'primordial_matter_recombination', itemInputs: [ '64x dishanhai:primordial_divergence_heart', '4x dishanhai:thread_shard_7', '16x dishanhai:wl_board_eternal', '16x dishanhai:singularity_ring' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'dishanhai:causal_essence 256000'], itemOutputs: ['1x dishanhai:primordial_engine_core'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_bhd_hyper_seed', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:artificial_neutron_star', '1x dishanhai:gravitational_lens', '4x dishanhai:singularity_ring', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:primal_chaos 256000', 'dishanhai:stabilized_eternity 128000'], itemOutputs: ['4x dishanhai:bhd_hyper_seed'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_bhd_collapser', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:bhd_hyper_seed', '1x dishanhai:annihilation_core', '1x dishanhai:strong_interaction_droplet', '4x dishanhai:singularity_ring' ], inputFluids: ['dishanhai:matter_fluid_ultimate 256000', 'dishanhai:causal_essence 128000'], itemOutputs: ['1x dishanhai:bhd_collapser'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_graviton_shard', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:artificial_neutron_star', '4x dishanhai:gravitational_vibration_string', '16x dishanhai:singularity_ring', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'dishanhai:stabilized_eternity 256000'], itemOutputs: ['4x gt_shanhai:graviton_shard'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  // ===== 苦命鸳鸯 =====
  { id: 'primordial_causal_weaving_ku_ming_yuan_yang', type: 'primordial_causal_weaving', itemInputs: [ '1x dishanhai:blue_alien', '1x dishanhai:long_zui', '1x dishanhai:halo_end', '4x dishanhai:singularity_ring', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '16x dishanhai:worldline_genesis_embryo' ], inputFluids: ['dishanhai:causal_essence 1024000', 'dishanhai:liquid_ending 512000', 'dishanhai:stabilized_eternity 256000'], itemOutputs: ['1x dishanhai:ku_ming_yuan_yang'], EUt: MAX, duration: 1000, conditions: ["64x dishanhai:wzyh"] },
  // ===== 帝山海（通关目标） =====
  { id: 'primordial_causal_weaving_dishanhai', type: 'primordial_causal_weaving', notConsumable: ['1x dishanhai:create_mk'], itemInputs: ["dishanhai:piggy"], inputFluids: ['dishanhai:causal_essence 2048000', 'dishanhai:stabilized_eternity 1024000', 'dishanhai:primal_chaos 1024000'], itemOutputs: ['1x dishanhai:dishanhai'], EUt: MAX, duration: 1200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_causal_weaving_blue_alien', type: 'primordial_causal_weaving', itemInputs: [ '64x dishanhai:blue_son', '16x dishanhai:worldline_genesis_embryo', '4x dishanhai:singularity_ring', '1024x dishanhai:genesis_shard' ], inputFluids: ['dishanhai:causal_essence 512000', 'dishanhai:stabilized_eternity 512000'], itemOutputs: ['1x dishanhai:blue_alien'], EUt: MAX, duration: 600, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_causal_weaving_long_zui', type: 'primordial_causal_weaving', itemInputs: [ '1x dishanhai:finality_certificate', '1x dishanhai:halo_end', '64x dishanhai:blue_son', '16x dishanhai:worldline_genesis_embryo' ], inputFluids: ['dishanhai:liquid_ending 512000', 'dishanhai:causal_essence 512000'], itemOutputs: ['1x dishanhai:long_zui'], EUt: MAX, duration: 600, conditions: ["64x dishanhai:wzyh"] },
  // ===== MAX+ 山海机器配方 =====
  { id: 'primordial_matter_recombination_black_hole_containment', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:bhd_collapser', '1x gt_shanhai:spacetime_wave_matrix', '4x dishanhai:singularity_ring', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '16x dishanhai:finality_certificate' ], inputFluids: ['dishanhai:matter_fluid_ultimate 1024000', 'gtceu:spacetime 2048000', 'dishanhai:stabilized_eternity 256000'], itemOutputs: ['1x gt_shanhai:black_hole_containment'], EUt: MAX, duration: 400, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_eternal_gregtech_workshop', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:reality_core', '1x dishanhai:universal_parallel_overdriver', '1x gt_shanhai:spacetime_wave_matrix', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '32x dishanhai:singularity_ring' ], inputFluids: ['dishanhai:matter_fluid_ultimate 1024000', 'dishanhai:stabilized_eternity 512000', 'dishanhai:causal_essence 512000'], itemOutputs: ['1x gt_shanhai:eternal_gregtech_workshop'], EUt: MAX, duration: 400, conditions: ["64x dishanhai:wzyh"] },
  // ===== 永恒格雷工坊模块 =====
  { id: 'primordial_matter_recombination_eternal_workshop_fusion_module', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:singularity_ring', '1x gt_shanhai:spacetime_wave_matrix', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '32x gtceu:spacetime_ingot' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'gtceu:spacetime 1024000', 'dishanhai:stabilized_eternity 256000'], itemOutputs: ['1x gt_shanhai:eternal_gregtech_workshop_fusion_module'], EUt: MAX, duration: 400, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_eternal_workshop_eye_of_harmony', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:worldline_genesis_embryo', '1x dishanhai:primordial_engine_core', '1x dishanhai:singularity_ring', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '32x dishanhai:genesis_shard' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'dishanhai:primal_chaos 512000', 'dishanhai:causal_essence 256000'], itemOutputs: ['1x gt_shanhai:eternal_gregtech_workshop_eye_of_harmony_module'], EUt: MAX, duration: 400, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_eternal_workshop_extra_module', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:universal_parallel_overdriver', '1x dishanhai:reality_anchor_module', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '32x dishanhai:wl_board_max' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'dishanhai:stabilized_eternity 256000'], itemOutputs: ['1x gt_shanhai:eternal_gregtech_workshop_extra_module'], EUt: MAX, duration: 400, conditions: ["32x dishanhai:wzyh"] },
  { id: 'assembler_eternal_workshop_data_module', type: 'assembler', itemInputs: [ '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '4x gtceu:data_module', '4x dishanhai:finality_certificate' ], inputFluids: ['dishanhai:causal_essence 64000'], itemOutputs: ['1x gt_shanhai:eternal_workshop_data_module'], EUt: MAX, duration: 200 },
  { id: 'primordial_matter_recombination_shanhai_nine_industrial', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:universal_parallel_overdriver', '1x dishanhai:reality_anchor_module', '1x dishanhai:annihilation_core', '1x dishanhai:wanxiang_core', '1x gt_shanhai:seventy_two_changes', '4x dishanhai:singularity_ring', '32x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '32x dishanhai:finality_certificate' ], inputFluids: ['dishanhai:matter_fluid_ultimate 2048000', 'dishanhai:stabilized_eternity 512000', 'dishanhai:causal_essence 512000', 'dishanhai:primal_chaos 512000'], itemOutputs: ['1x gt_shanhai:shanhai_nine_industrial'], EUt: MAX, duration: 600, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_central_finite_curve', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:universal_parallel_overdriver', '1x dishanhai:cshx', '1x dishanhai:primordial_engine_core', '1x dishanhai:reality_core' ], inputFluids: ['dishanhai:matter_fluid_ultimate 1024000', 'dishanhai:causal_essence 1024000'], itemOutputs: ['1x dishanhai:central_finite_curve'], EUt: MAX, duration: 400 },
  // ===== 永恒格雷工坊建材配方（MAX级组装机，批量产出） =====
  { id: 'assembler_transcendentally_reinforced_borosilicate_glass', type: 'assembler', itemInputs: [ '64x gtceu:fusion_glass', '4x gtceu:transcendentmetal_plate', '1x dishanhai:genesis_shard' ], inputFluids: ['dishanhai:matter_fluid_ultimate 64000'], itemOutputs: ['64x dishanhai:transcendentally_reinforced_borosilicate_glass'], EUt: MAX, duration: 200 },
  { id: 'assembler_omni_purpose_infinity_fused_glass', type: 'assembler', itemInputs: [ '64x gtceu:fusion_glass', '4x gtceu:infinity_plate', '1x dishanhai:singularity_ring' ], inputFluids: ['dishanhai:matter_fluid_ultimate 64000', 'gtceu:spacetime 64000'], itemOutputs: ['32x dishanhai:omni_purpose_infinity_fused_glass'], EUt: MAX, duration: 200 },
  { id: 'assembler_reinforced_temporal_structure_casing', type: 'assembler', itemInputs: [ '32x gtceu:uxv_machine_casing', '4x gtceu:spacetime_ingot', '1x dishanhai:worldline_imaginary_string' ], inputFluids: ['dishanhai:matter_fluid_ultimate 64000', 'gtceu:spacetime 64000'], itemOutputs: ['32x dishanhai:reinforced_temporal_structure_casing'], EUt: MAX, duration: 200 },
  { id: 'assembler_reinforced_spatial_structure_casing', type: 'assembler', itemInputs: [ '16x gtceu:uxv_machine_casing', '4x gtceu:spacetime_ingot', '1x dishanhai:worldline_boundless_singularity' ], inputFluids: ['dishanhai:matter_fluid_ultimate 64000'], itemOutputs: ['16x dishanhai:reinforced_spatial_structure_casing'], EUt: MAX, duration: 200 },
  { id: 'assembler_naquadria_reinforced_water_plant_casing', type: 'assembler', itemInputs: [ '32x gtceu:uxv_machine_casing', '4x gtceu:naquadria_plate', '1x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 64000', 'minecraft:water 128000'], itemOutputs: ['32x dishanhai:naquadria_reinforced_water_plant_casing'], EUt: MAX, duration: 200 },
  { id: 'assembler_particle_beam_guidance_pipe_casing', type: 'assembler', itemInputs: [ '32x gtceu:uxv_machine_casing', '4x gtceu:double_neutronium_plate', '1x dishanhai:worldline_divergent_core' ], inputFluids: ['dishanhai:matter_fluid_ultimate 64000'], itemOutputs: ['32x dishanhai:particle_beam_guidance_pipe_casing'], EUt: MAX, duration: 200 },
  { id: 'assembler_quark_exclusion_casing', type: 'assembler', itemInputs: [ '16x gtceu:uxv_machine_casing', '4x gtceu:double_neutronium_plate', '1x dishanhai:genesis_shard' ], inputFluids: ['dishanhai:matter_fluid_ultimate 64000', 'dishanhai:primal_chaos 32000'], itemOutputs: ['16x dishanhai:quark_exclusion_casing'], EUt: MAX, duration: 200 },
  { id: 'assembler_gallifreyan_spacetime_compression_field_generator', type: 'assembler', itemInputs: [ '8x gtlcore:max_field_generator', '4x gtceu:spacetime_ingot', '1x dishanhai:singularity_ring' ], inputFluids: ['dishanhai:matter_fluid_ultimate 128000', 'gtceu:spacetime 128000'], itemOutputs: ['8x dishanhai:gallifreyan_spacetime_compression_field_generator'], EUt: MAX, duration: 200 },
  { id: 'assembler_gallifreyan_time_dilation_field_generator', type: 'assembler', itemInputs: [ '8x gtlcore:max_field_generator', '4x gtceu:spacetime_ingot', '1x dishanhai:worldline_imaginary_string' ], inputFluids: ['dishanhai:matter_fluid_ultimate 128000', 'gtceu:spacetime 128000'], itemOutputs: ['8x dishanhai:gallifreyan_time_dilation_field_generator'], EUt: MAX, duration: 200 },
  { id: 'assembler_gallifreyan_stabilisation_field_generator', type: 'assembler', itemInputs: [ '4x gtlcore:max_field_generator', '2x gtceu:spacetime_ingot', '1x dishanhai:annihilation_core' ], inputFluids: ['dishanhai:matter_fluid_ultimate 256000', 'dishanhai:stabilized_eternity 128000'], itemOutputs: ['4x dishanhai:gallifreyan_stabilisation_field_generator'], EUt: MAX, duration: 400 },
];



var matterFlowCondensationRecipeDefs = [
    ['wl_board_lv', ['dishanhai:first_light'], ['dishanhai:light 2000'], ['dishanhai:matter_fluid_entry', 'dishanhai:zero_point_energy'], ulv, 20, null],
    ['basic', ['1x minecraft:ender_pearl'], ['gtceu:glass 1000', 'gtceu:polyethylene 1000'], ['dishanhai:matter_fluid_basic 1000'], 32, 100, 'dishanhai:wzrm'],
    ['foundation', ['1x gtceu:stainless_steel_ingot', '1x gtceu:silicon_ingot', '1x gtceu:exquisite_emerald_gem'], ['gtceu:kanthal 1000', 'gtceu:vanadium_steel 1000'], ['dishanhai:matter_fluid_foundation 1000'], 128, 100, 'dishanhai:wzjc'],
    ['virtual', ['1x gtceu:nichrome_ingot', '1x gtceu:titanium_ingot', '1x minecraft:ender_eye'], ['gtceu:soldering_alloy 1000', 'gtceu:polytetrafluoroethylene 1000'], ['dishanhai:matter_fluid_virtual 1000'], 512, 100, 'dishanhai:wzcz1'],
    ['transmutation', ['1x minecraft:nether_star', '1x gtceu:uranium_triplatinum_ingot', '1x gtceu:tungsten_steel_ingot'], ['gtceu:radon 1000', 'gtceu:epoxy 1000'], ['dishanhai:matter_fluid_transmutation 1000'], 2048, 100, 'dishanhai:wzxc'],
    ['darkstar', ['1x gtceu:rhodium_plated_palladium_ingot', '1x gtceu:samarium_iron_arsenic_oxide_ingot', '1x gtceu:hsse_ingot'], ['gtceu:polybenzimidazole 1000', 'gtceu:styrene_butadiene_rubber 1000'], ['dishanhai:matter_fluid_darkstar 1000'], 8192, 100, 'dishanhai:wzsb'],
    ['advanced_luv', ['1x gtceu:naquadah_alloy_ingot', '1x gtceu:uranium_rhodium_dinaquadide_ingot', '1x gtceu:indium_tin_barium_titanium_cuprate_ingot'], ['gtceu:duranium 1000', 'gtceu:europium 1000'], ['dishanhai:matter_fluid_advanced 1000'], 32768, 100, 'dishanhai:wzax'],
    ['transition', ['1x gtceu:tritanium_ingot', '1x gtceu:naquadria_ingot', '1x gtceu:enriched_naquadah_trinium_europium_duranide_ingot'], ['gtceu:curium 1000', 'gtceu:antineutron 1000'], ['dishanhai:matter_fluid_transition 1000'], 131072, 100, 'dishanhai:wzcz2'],
    ['zero', ['1x gtceu:highurabilityompoundteel_ingot', '1x gtceu:pikyonium_ingot', '1x gtceu:ruthenium_trinium_americium_neutronate_ingot'], ['gtceu:mutated_living_solder 1000', 'gtceu:antimatter 100'], ['dishanhai:matter_fluid_zero 1000'], uv, 100, 'dishanhai:wzqs'],
    ['peak', ['1x gtceu:dubnium_ingot', '1x gtceu:seaborgium_ingot', '1x gtceu:carbon_nanotubes_ingot'], ['gtceu:enderium_plasma 1000', 'gtceu:cycloparaphenylene 1000'], ['dishanhai:matter_fluid_peak 1000'], uhv, 100, 'dishanhai:wzgl'],
    ['ascension', ['1x gtceu:taranium_ingot', '1x gtceu:attuned_tengam_ingot', '1x gtceu:echoite_ingot'], ['gtceu:euv_photoresist 1000', 'gtceu:californium 1000'], ['dishanhai:matter_fluid_ascension 1000'], uev, 100, 'dishanhai:wzhy'],
    ['transcend', ['1x gtceu:heavy_quark_degenerate_matter_ingot', '1x gtceu:legendarium_ingot', '1x gtceu:superheavy_h_alloy_ingot'], ['gtceu:quark_gluon_plasma 1000', 'gtceu:heavy_lepton_mixture 1000'], ['dishanhai:matter_fluid_transcend 1000'], uiv, 100, 'dishanhai:wzsw'],
    ['chaos', ['1x gtceu:crystalmatrix_ingot', '1x gtceu:starmetal_ingot', '1x gtceu:draconiumawakened_ingot'], ['gtceu:radox 1000', 'gtceu:liquid_starlight 1000'], ['dishanhai:primal_chaos 1000'], uxv, 100, 'dishanhai:wzcx'],
    ['eternal', ['1x gtceu:spacetime_ingot', '1x gtceu:magmatter_ingot', '1x gtceu:transcendentmetal_ingot'], ['gtceu:spacetime 1000', 'gtceu:primordialmatter 1000'], ['dishanhai:matter_fluid_eternal 1000'], opv, 100, 'dishanhai:wzdf'],
    ['ultimate', ['1x gtladditions:creon_ingot', '1x gtladditions:mellion_dust', '1x gtladditions:super_dense_magmatter_plate'], ['gtladditions:star_gate_crystal_slurry 1000', 'gtceu:spatialfluid 1000'], ['dishanhai:matter_fluid_ultimate 1000'], MAX, 100, 'dishanhai:wzyh']
];

function buildMatterFlowCondensationRecipes(defs) {
    var recipes = [];
    for (var i = 0; i < defs.length; i++) {
        var d = defs[i];
        var recipe = {
            id: 'matter_flow_condensation_' + d[0],
            type: 'matter_flow_condensation',
            itemInputs: d[1],
            inputFluids: d[2],
            outputFluids: d[3],
            EUt: d[4],
            duration: d[5]
        };
        if (d[6]) recipe.conditions = ['1x ' + d[6]];
        recipes.push(recipe);
    }
    return recipes;
}

myRecipes = myRecipes.concat(buildMatterFlowCondensationRecipes(matterFlowCondensationRecipeDefs));

// ——— 统一处理引擎 ———
// 预热缓存
DShanhaiRecipeEngine.precache([myRecipes, suprecipes_1, assemblerRecipes, moduleRecipes]);

myRecipes.forEach(recipe => {
    if (!gtr[recipe.type]) {
        console.error(`❌ 未知机器类型: ${recipe.type}`);
    }
    safeAddRecipe(recipe.type, 'dishanhai:' + recipe.id, function() {
        buildRecipe(gtr[recipe.type]('dishanhai:' + recipe.id), recipe);
    }, recipe);
});


    safeAddRecipe('qft','dishanhai:compressed_astral_array_scsource',function() {
        gtr.qft('dishanhai:compressed_astral_array_scsource')
            .itemInputs("144x gtladditions:black_hole_seed","64x gtceu:eternity_nanoswarm","64x gtceu:spacetime_nanoswarm","64x minecraft:repeating_command_block","1024x gtladditions:astral_array")
            .inputFluids('gtceu:miracle 576000')
            .itemOutputs("gtladditions:compressed_astral_array")
            .EUt(max)
            .duration(20)
    });


        // ========== 创造天机模块 ==========
        safeAddRecipe('suprachronal_assembly_line', 'dishanhai:cztj',function() {
            gtr.suprachronal_assembly_line('dishanhai:cztj')
                .notConsumable('dishanhai:wzcz3')
                .itemInputs('1024x thetornproductionline:celestial_secret_deducing_module_advanced_max','2048x thetornproductionline:celestial_secret_deducing_module_max','4096x thetornproductionline:celestial_secret_deducing_module_opv','8192x thetornproductionline:celestial_secret_deducing_module_uxv','16384x thetornproductionline:celestial_secret_deducing_module_uiv','32726x thetornproductionline:celestial_secret_deducing_module_uev','4096x kubejs:suprachronal_mainframe_complex','4096x kubejs:create_ultimate_battery','10x kubejs:hyperdimensional_drone')
                .inputFluids('gtceu:celestial_secret_plasma 2147483647')
                .itemOutputs('thetornproductionline:celestial_secret_deducing_creative_module')
                .EUt(2147483647*max)
                .duration(10000);
        },{defaultEnabled:false})

    // ========== 蒸馏塔配方 ==========
    safeAddRecipe('distillery', 'dishanhai:yixi', function() {
        gtr.distillery('dishanhai:yixi')
            .circuit(23)
            .inputFluids('minecraft:lava 2000')
            .outputFluids('gtceu:ethylene 1000')
            .duration(20)
            .EUt(LV);
    });
    
    safeAddRecipe('distillery', 'dishanhai:yicun', () => {
        gtr.distillery('dishanhai:yicun')
            .circuit(24)
            .inputFluids('minecraft:lava 2000')
            .outputFluids('gtceu:ethanol 1000')
            .duration(20)
            .EUt(20);
    });
    
    // ========== 天基矿石处理中心 ==========
    safeAddRecipe('assembler_module', 'dishanhai:tianjiop', () => {
        gtr.assembler_module('dishanhai:tianjiop')
            .itemInputs('114514x gtceu:void_miner','114514x gtceu:integrated_ore_processor','114514x gtceu:large_void_miner','57257x gtceu:flotation_cell_regulator','2147483647x minecraft:dragon_egg','2147483647x kubejs:warped_ender_pearl','12x gtceu:space_elevator','6x gtceu:resource_collection','6x gtceu:assembler_module')
            .inputFluids('gtceu:stellar_energy_rocket_fuel 2147483647','gtceu:rocket_fuel_rp_1 114514','gtceu:rocket_fuel_cn3h7o3 114514','gtceu:rocket_fuel_h8n4c2o4 114514')
            .itemOutputs('gtladditions:space_infinity_integrated_ore_processor')
            .EUt(UHV)
            .duration(20);
        e.remove({output:'gtladditions:space_infinity_integrated_ore_processor',mod:'gtladditions'});
    });
    


    // ========== 提取机配方 ==========
    //牛肉提取牛奶 做逆天的一集
    safeAddRecipe('extractor', 'dishanhai:milk', () => {
        gtr.extractor("dishanhai:milk")
            .itemInputs('1x minecraft:beef')
            .outputFluids('gtceu:milk 1000')
            .EUt(120)
            .duration(20);
    });
    //水晶矩阵锭提取
    safeAddRecipe('extractor','dishanhai:crystal_matrix_ingot',()=>{
    gtr.extractor('dishanhai:crystal_matrix_ingot')
    .itemInputs('avaritia:crystal_matrix_ingot')
    .outputFluids('gtceu:crystalmatrix 144')
    .EUt(ulv).duration(20)
})



// 宏合并所有物品 ID（粗矿 + 矿石）
try {
let rawIds = Ingredient.of('#forge:raw_materials').getItemIds();
let rawIds_2 = Ingredient.of('#forge:ores').getItemIds();
let outputs = rawIds.map(id => Item.of(id, 1024));
let outputs_2 = rawIds_2.map(id => Item.of(id, 1024));
let allOutputs = outputs.concat(outputs_2);

safeAddRecipe('star_core_stripper', 'dishanhai:star_core_stripper_infinite_minerals', () => {
    let builder = gtr.star_core_stripper('dishanhai:star_core_stripper_infinite_minerals')
        .notConsumable('dishanhai:time_reversal_protocol')
        .circuit(1);
    if (allOutputs.length > 0) {
        builder.itemOutputs.apply(builder, allOutputs);
    }
    
    builder.EUt(max).duration(200);
    console.log(`输出 ${allOutputs.length} 种物品`);
});
}catch(err){
    console.log(err);
}

//宏产世界碎片
try {
let shards_2 = Ingredient.of('/gtlcore:world_fragments_.*/').getItemIds();
let all_outputs_3 = shards_2.map(id => Item.of(id, 64));
safeAddRecipe('star_core_stripper', 'dishanhai:world_fragments', () => {
let builder_2 = gtr.star_core_stripper('dishanhai:world_fragments')
        .notConsumable('dishanhai:time_reversal_protocol')
        .circuit(2);
    if (all_outputs_3.length > 0) {
        builder_2.itemOutputs.apply(builder_2, all_outputs_3);
    }
    builder_2.EUt(max).duration(200);
    console.log(`输出 ${all_outputs_3.length} 种物品`);
});
}catch(err){
    console.log(err);
}


try {
    var oreIds = Ingredient.of('#forge:ores').getItemIds();
    var outputStacks = [];

    // 定义需要排除的前缀列表（这些前缀出现在矿物名之前，如 pure_cooperite_dust）
    var excludePrefixes = ['pure_', 'impure_', 'small_', 'tiny_', 'refined_', 'crushed_', 'centrifuged_'];

    oreIds.forEach(function(oreId) {
        var match = oreId.match(/([^:]+):(.+)_ore$/);
        if (!match) return;
        var namespace = match[1];
        var mineral = match[2];

        // 宽松正则：匹配同一命名空间下包含矿物名的任意物品
        var pattern = '^' + namespace + ':.*' + mineral + '.*$';
        var regex = new RegExp(pattern);
        var matches = Ingredient.of('/' + regex.source + '/').getItemIds();

        // 过滤：排除 _raw / _ore，排除带有排除前缀的物品，且必须是粉/锭/水晶/宝石或原版矿物名
        var filtered = matches.filter(function(id) {
            if (id.includes('_raw') || id.includes('_ore')) return false;
            var stack = Item.of(id, 1);
            if (stack.isEmpty()) return false;

            // 检查是否包含排除前缀（例如 pure_impure_small_tiny等）
            for (var i = 0; i < excludePrefixes.length; i++) {
                if (id.includes(excludePrefixes[i])) {
                    return false;
                }
            }

            // 后缀匹配：必须是以 _dust, _ingot, _crystal, _gem 结尾
            if (id.endsWith('_dust') || id.endsWith('_ingot') || 
                id.endsWith('_crystal') || id.endsWith('_gem')) {
                // 确保矿物名出现在正确位置（通常是后缀前，且前面没有额外前缀）
                // 例如 cooperite_dust 符合，但 pure_cooperite_dust 已被排除
                var parts = id.split(':');
                var path = parts[1];
                // 检查是否以 mineral_ 开头（矿物名直接作为前缀）
                if (path.indexOf(mineral + '_') === 0) {
                    return true;
                }
                // 检查是否包含 _mineral 且后面紧跟后缀（如 dust_cooperite 格式，但很少见）
                if (path.indexOf('_' + mineral) !== -1 && path.endsWith('_' + mineral + '_dust') === false) {
                    // 注意：避免匹配到 ..._mineral_suffix，这里简单允许，但已被排除前缀过滤
                    return true;
                }
                return false;
            }
            // 原版特殊：minecraft:coal, minecraft:diamond 等
            if (id === 'minecraft:' + mineral) {
                return true;
            }
            return false;
        });

        if (filtered.length > 0) {
            var productId = filtered[0]; // 取第一个有效产物
            var stack = Item.of(productId, 64);
            if (!stack.isEmpty()) outputStacks.push(stack);
        } else {
         
        }
    });

    if (outputStacks.length === 0) {
        console.log('没有有效的矿石产物输出，跳过 star_core_stripper_ores');
    } else {
        safeAddRecipe('star_core_stripper', 'dishanhai:star_core_stripper_ores', function() {
            gtr.star_core_stripper('dishanhai:star_core_stripper_ores')
                .notConsumable('dishanhai:time_reversal_protocol')
                .circuit(3)
                .itemOutputs(outputStacks)
                .EUt(max)
                .duration(200);
            console.log('输出 ' + outputStacks.length + ' 种矿石产物（已排除杂质前缀）');
        },{defaultEnabled:false});
    }
} catch(err) {
    console.log(err);
}

var miracle = ['gtlcore:miracle_crystal']
var crystalStacks = ['gtlcore:treasures_crystal','gtlcore:mining_crystal'];
let output_1 = crystalStacks.map(stack => Item.of(stack, 16));
let miracle_output = miracle.map(stack => Item.of(stack, 8));
var fluid_input = ['gtceu:miracle_gas'];
var input_quantity = fluid_input.map(fluid => fluid+' 10000');
let Total_output = output_1.concat(miracle_output);
safeAddRecipe('star_core_stripper', 'dishanhai:star_core_stripper_crystal', function() {
    var builder = gtr.star_core_stripper('dishanhai:star_core_stripper_crystal')
        .notConsumable('dishanhai:time_reversal_protocol')
        .circuit(4)
        .itemOutputs(Total_output)
        .outputFluids(input_quantity)
        .EUt(max)
        .duration(200);
    });

var fluid_output_assembly = ['gtceu:oil','gtceu:oil_medium','gtceu:oil_heavy','gtceu:oil_light','gtceu:helium','minecraft:lava','gtceu:benzene','gtceu:barnarda_air','gtceu:hydrochloric_acid','gtceu:radon','gtceu:chlorine','gtceu:methane','gtceu:krypton','gtceu:fluorine','gtceu:natural_gas','gtceu:sulfuric_acid','gtceu:charcoal_byproducts','gtceu:deuterium','gtceu:neon','gtceu:nitric_acid','gtceu:coal_gas','gtceu:helium_3','gtceu:salt_water','gtceu:unknowwater','gtceu:xenon'];
var Total_fluid_input = fluid_output_assembly.map(fluid => fluid+' 2147483647');

safeAddRecipe('star_core_stripper', 'dishanhai:star_core_stripper_fluid_2', function() {
    gtr.star_core_stripper('dishanhai:star_core_stripper_fluid_2')
        .notConsumable('dishanhai:time_reversal_protocol')
        .circuit(5)
        .outputFluids(Total_fluid_input)
        .EUt(max)
        .duration(200);

    });

try {
//电力专区
safeAddRecipe('genesis_engine', 'dishanhai:genesis_engine_dark_energy_multiplier',() => {
    gtr.genesis_engine('dishanhai:genesis_engine_dark_energy_multiplier')
    .notConsumable('dishanhai:dark_energy_multiplier')
    .duration(2147483647)
    .EUt(-9221474836470000000)
})
//苦命鸳鸯
safeAddRecipe('genesis_engine', 'dishanhai:ku_ming_yuan_yang',() => {
    gtr.genesis_engine('dishanhai:ku_ming_yuan_yang')
    .notConsumable("dishanhai:blue_alien")
    .notConsumable("dishanhai:long_zui")
    .chancedOutput('1x dishanhai:ku_ming_yuan_yang', 10,0)
    .duration(114514)
    .EUt(-114514)
},{defaultEnabled:false})
safeAddRecipe('annihilate_generator', 'dishanhai:annihilate_generator_dark_energy_multiplier',() => {
    gtr.annihilate_generator('dishanhai:annihilate_generator_dark_energy_multiplier')
    .notConsumable('dishanhai:dark_energy_multiplier')
    .duration(2147483647)
    .EUt(-9221474836470000000)
})

safeAddRecipe('steam_turbine', 'dishanhai:steam_turbine_dark_energy_multiplier',() => {
    gtr.steam_turbine('dishanhai:steam_turbine_dark_energy_multiplier')
    .notConsumable('dishanhai:dark_energy_multiplier')
    .inputFluids('minecraft:water 1')
    .duration(2147483647)
    .EUt(-9221474836470000000)
})

safeAddRecipe('rocket_engine', 'dishanhai:rocket_engine',() => {
    gtr.rocket_engine('dishanhai:rocket_engine')
    .notConsumable('dishanhai:dark_energy_multiplier')
    .inputFluids('minecraft:water 1')
    .duration(2147483647)
    .EUt(-9221474836470000000)
})

safeAddRecipe('naquadah_reactor', 'dishanhai:naquadah_reactor',() => {
    gtr.naquadah_reactor('dishanhai:naquadah_reactor')
    .notConsumable('dishanhai:dark_energy_multiplier')
    .inputFluids('minecraft:water 1')
    .duration(2147483647)
    .EUt(-9221474836470000000)
})

safeAddRecipe('large_naquadah_reactor', 'dishanhai:large_naquadah_reactor',() => {
    gtr.large_naquadah_reactor('dishanhai:large_naquadah_reactor')
    .notConsumable('dishanhai:dark_energy_multiplier')
    .inputFluids('minecraft:water 1')
    .duration(2147483647)
    .EUt(-9221474836470000000)
})

safeAddRecipe('dyson_sphere', 'dishanhai:dyson_sphere',() => {
    gtr.dyson_sphere('dishanhai:dyson_sphere')
    .notConsumable('dishanhai:dark_energy_multiplier')
    .inputFluids('minecraft:water 1')
    .duration(2147483647)
    .EUt(-9221474836470000000)
})

safeAddRecipe('semi_fluid_generator', 'dishanhai:semi_fluid_generator',() => {
    gtr.semi_fluid_generator('dishanhai:semi_fluid_generator')
    .notConsumable('dishanhai:dark_energy_multiplier')
    .inputFluids('minecraft:water 1')
    .duration(2147483647)
    .EUt(-9221474836470000000)
})

safeAddRecipe('supercritical_steam_turbine', 'dishanhai:supercritical_steam_turbine',() => {
    gtr.supercritical_steam_turbine('dishanhai:supercritical_steam_turbine')
    .notConsumable('dishanhai:dark_energy_multiplier')
    .inputFluids('minecraft:water 1')
    .duration(2147483647)
    .EUt(-9221474836470000000)
})

safeAddRecipe('advanced_hyper_reactor', 'gtceu:advanced_hyper_reactor/concentration_mixing_hyper_fuel',() => {
    gtr.advanced_hyper_reactor('gtceu:advanced_hyper_reactor/concentration_mixing_hyper_fuel')
    .notConsumable('dishanhai:dark_energy_multiplier')
    .inputFluids('minecraft:water 1')
    .duration(2147483647)
    .EUt(-9221474836470000000)
})

safeAddRecipe('hyper_reactor', 'dishanhai:hyper_excitation',() => {
    gtr.hyper_reactor('dishanhai:hyper_excitation')
    .notConsumable('dishanhai:dark_energy_multiplier')
    .inputFluids('minecraft:water 1')
    .duration(2147483647)
    .EUt(-9221474836470000000)
})
} catch (error) {
    console.error(error);
}

safeAddRecipe('element_copying', 'dishanhai:element_copying',() => {
    gtr.element_copying('dishanhai:element_copying_astral_array')
    .notConsumable('gtladditions:astral_array')
    .inputFluids('gtladditions:star_gate_crystal_slurry 950',"gtceu:uu_matter 1000")
    .itemOutputs('1x gtladditions:astral_array')
    .duration(200)
    .EUt(max)
})

// ========== 量子化现实重构（终焉时空扭曲）==========
// 以下配方需要 gt_shanhai 模组注册的配方类型
if (Platform.isLoaded('gt_shanhai')) {
    // ========== 苦命鸳鸯 ==========
    safeAddRecipe('kmyy', 'gt_shanhai:kmyy', () => {
        gtr.kmyy('gt_shanhai:kmyy')
            .itemInputs(
                "dishanhai:blue_alien",
                "dishanhai:long_zui"
            )
            .itemOutputs(
                "dishanhai:ku_ming_yuan_yang"
            )
            .EUt(-114514)
            .duration(114514)
            
    },{defaultEnabled:false})

    safeAddRecipe('spacetime_distortion', 'gt_shanhai:quantized_reality_assembly', () => {
        gtr.spacetime_distortion('gt_shanhai:quantized_reality_assembly')
            .itemInputs(
                '64x gtceu:eternity_ingot',
                "64x avaritia:infinity_ingot",
                'kubejs:time_dilation_containment_unit',
                'kubejs:charged_triplet_neutronium_sphere'
            )
            .inputFluids(
                'gtceu:spacetime 10000',
                'gtceu:uu_matter 10000'
            )
            .itemOutputs(
                '1x gtladditions:astral_array',
                '4x kubejs:contained_kerr_newmann_singularity'
            )
            .EUt(MAX)
            .duration(2400)
    },{defaultEnabled:false})


    // ═══════════════════════════════════════════════════════════════
    // 量子化现实重构 — 简化配方组（均比原版配方更便宜）
    // ═══════════════════════════════════════════════════════════════

    // 星门水晶浆液（原版DTPF：16种流体各1M+9种物各4096，MAX*65536EU/t；简化：8物+6流体，MAX→1000mb）
    safeAddRecipe('spacetime_distortion', 'gt_shanhai:star_gate_crystal_slurry', () => {
        gtr.spacetime_distortion('gt_shanhai:star_gate_crystal_slurry')
            .itemInputs('640x kubejs:void_matter', '640x kubejs:temporal_matter', '640x kubejs:omni_matter', '640x kubejs:kinetic_matter', '640x kubejs:dark_matter', '640x kubejs:essentia_matter', '640x kubejs:corporeal_matter', '640x kubejs:amorphous_matter')
            .inputFluids('gtceu:spacetime 100000', 'gtceu:uu_matter 100000', 'gtceu:cosmic 100000', 'gtceu:miracle 100000', 'gtceu:infinity 100000', 'dishanhai:primal_chaos 100000')
            .outputFluids('gtladditions:star_gate_crystal_slurry 1000')
            .EUt(MAX)
            .duration(1200)
    })

    // 鱼大（AE2样板：8个中间部件直接合成，比装配线9件+压缩河豚+超胶便宜）
    safeAddRecipe('spacetime_distortion', 'gt_shanhai:fishbig_easy', () => {
        gtr.spacetime_distortion('gt_shanhai:fishbig_easy')
            .itemInputs('1x kubejs:fishbig_hair', '3x kubejs:fishbig_frame', '1x kubejs:fishbig_hade', '1x kubejs:fishbig_lhand', '1x kubejs:fishbig_body', '1x kubejs:fishbig_rhand', '1x kubejs:fishbig_lleg', '1x kubejs:fishbig_rleg')
            .itemOutputs('1x expatternprovider:fishbig')
            .EUt(uxv)
            .duration(200)
    })

    // 茶 §6§o（AE2样板：heartofthesmogus×4+temporal/dark_matter×67108+compressed_astral_array×16+infinity_bucket×1024+4流体各1B/384M）
    safeAddRecipe('spacetime_distortion', 'gt_shanhai:ultimate_tea', () => {
        gtr.spacetime_distortion('gt_shanhai:ultimate_tea')
            .itemInputs('4x kubejs:heartofthesmogus', '67108x kubejs:temporal_matter', '67108x kubejs:dark_matter', '16x gtladditions:compressed_astral_array', '1024x avaritia:infinity_bucket')
            .inputFluids('gtceu:miracle 1000000000', 'gtceu:magnetohydrodynamicallyconstrainedstarmatter 1000000000', 'gtladditions:phonon_medium 384000000', 'gtceu:primordialmatter 1000000000')
            .itemOutputs('1x gtlcore:ultimate_tea')
            .EUt(MAX)
            .duration(1200)
    })

    // 液态磁流体约束恒星物质（原版DTPF：1 nanoswarm+400k plasma+100k exciteddtsc，MAX*960EU/t，25600tick）
    safeAddRecipe('spacetime_distortion', 'gt_shanhai:magnetohydrodynamicallyconstrainedstarmatter', () => {
        gtr.spacetime_distortion('gt_shanhai:magnetohydrodynamicallyconstrainedstarmatter')
            .itemInputs('1x gtceu:eternity_nanoswarm')
            .inputFluids('gtceu:raw_star_matter_plasma 400000', 'gtceu:exciteddtsc 100000')
            .outputFluids('gtceu:magnetohydrodynamicallyconstrainedstarmatter 400000')
            .EUt(MAX)
            .duration(2400)
    })

    // 无损声子传输介质（AE2样板：echoite×2+praseodymium×2+metastable_oganesson×2+magneto_resonatic×1+phonon_crystal_solution 1000，UV→1000mb）
    safeAddRecipe('spacetime_distortion', 'gt_shanhai:phonon_medium', () => {
        gtr.spacetime_distortion('gt_shanhai:phonon_medium')
            .itemInputs('2x gtceu:echoite_dust', '2x gtceu:praseodymium_dust', '2x gtceu:metastable_oganesson_dust', '1x gtceu:magneto_resonatic_dust')
            .inputFluids('gtladditions:phonon_crystal_solution 1000')
            .outputFluids('gtladditions:phonon_medium 1000')
            .EUt(uv)
            .duration(400)
    })

    // 超级并行控制仓（原版defaultEnabled:false，提供可用的简化替代）
    safeAddRecipe('spacetime_distortion', 'gt_shanhai:super_parallel_core_easy', () => {
        gtr.spacetime_distortion('gt_shanhai:super_parallel_core_easy')
            .itemInputs('1x gtceu:molecular_assembler_matrix', '16x dishanhai:wl_board_eternal')
            .inputFluids('dishanhai:matter_fluid_ultimate 64000')
            .itemOutputs('1x gt_shanhai:super_parallel_core')
            .EUt(MAX)
            .duration(600)
    })

    // 黑洞种子（AE2样板：max_emitter×16+uev聚变×16+double_proto_halkonite_plate×32+hypercube×64+4流体各92160，UXV）
    safeAddRecipe('spacetime_distortion', 'gt_shanhai:black_hole_seed_easy', () => {
        gtr.spacetime_distortion('gt_shanhai:black_hole_seed_easy')
            .itemInputs('16x gtlcore:max_emitter', '16x gtceu:uev_compressed_fusion_reactor', '32x gtladditions:double_proto_halkonite_plate', '64x kubejs:hypercube')
            .inputFluids('gtladditions:creon 92160', 'gtceu:white_dwarf_mtter 92160', 'gtceu:tartarite 92160', 'gtceu:black_dwarf_mtter 92160')
            .itemOutputs('1x gtladditions:black_hole_seed')
            .EUt(uxv)
            .duration(200)
    })

    // 奇异湮灭燃料棒（原版精密组装：infinity_antimatter_fuel_rod×192+hypercube×64+4流体，UXV级12tick）
    safeAddRecipe('spacetime_distortion', 'gt_shanhai:strange_annihilation_fuel_rod_easy', () => {
        gtr.spacetime_distortion('gt_shanhai:strange_annihilation_fuel_rod_easy')
            .itemInputs('8x kubejs:infinity_antimatter_fuel_rod', '8x kubejs:hypercube')
            .inputFluids('gtceu:cosmic 144', 'gtceu:magnetohydrodynamicallyconstrainedstarmatter 160', 'gtceu:spacetime 576')
            .itemOutputs('1x gtladditions:strange_annihilation_fuel_rod')
            .EUt(uxv)
            .duration(200)
    })

    // 压缩星阵（原版：black_hole_seed×144+eternity/spacetime nanoswarm×64+command_block×64+miracle 576k，600tick）
    safeAddRecipe('spacetime_distortion', 'gt_shanhai:compressed_astral_array_easy', () => {
        gtr.spacetime_distortion('gt_shanhai:compressed_astral_array_easy')
            .itemInputs('16x gtladditions:black_hole_seed', '64x gtceu:eternity_nanoswarm', '64x gtceu:spacetime_nanoswarm', '128x gtladditions:astral_array')
            .inputFluids('gtceu:miracle 576000')
            .itemOutputs('1x gtladditions:compressed_astral_array')
            .EUt(MAX)
            .duration(1200)
    })

    // 真空零点能 — 前期蒸汽发电
    safeAddRecipe('primordial_power_generator:zero_point_energy', 'gt_shanhai:zero_point_energy', () => {
    gtr.primordial_power_generator('zero_point_energy')
        .notConsumable('dishanhai:dark_energy_multiplier')
        .inputFluids('minecraft:water 100')
        .outputFluids('dishanhai:zero_point_energy 128000')
        .duration(200)
    })

    //引力波透镜+凛冰简化配方
    safeAddRecipe('gravitational_wave_consumption', 'gt_shanhai:quantized_reality_consumption_fluid', () => {
        gtr.gravitational_wave_consumption('dishanhai:quantized_reality_consumption_fluid')
            .notConsumable('32x dishanhai:gravitational_lens')
            .inputFluids(
            'kubejs:gelid_cryotheum 20' 
            )
            .EUt(ZPM)
            .duration(10000)
    })
    // 高级物质模块+宇宙素普通配方
    safeAddRecipe('gravitational_wave_consumption', 'gt_shanhai:quantized_reality_consumption_item', () => {
        gtr.gravitational_wave_consumption('dishanhai:quantized_reality_consumption_item')
            .notConsumable("3200x dishanhai:wzcz2")
            .inputFluids(
            'gtceu:cosmic_element 1000'
            )
            .EUt(ZPM)
            .duration(1000)
    })


        safeAddRecipe('nebula_siphoning', 'dishanhai:first_light_from_energy', () => {
            gtr.nebula_siphoning('dishanhai:first_light_from_energy')
                .circuit(1)
                .itemOutputs('1x dishanhai:first_light')
                .EUt(8192)
                .duration(600)
        })

        safeAddRecipe('nebula_siphoning', 'dishanhai:light_fluid_extract', () => {
            gtr.nebula_siphoning('dishanhai:light_fluid_extract')
                .itemInputs('4x dishanhai:first_light')
                .outputFluids('dishanhai:light 1000')
                .EUt(8192)
                .duration(400)
        })

        safeAddRecipe('nebula_siphoning', 'dishanhai:photon_synthesis', () => {
            gtr.nebula_siphoning('dishanhai:photon_synthesis')
                .inputFluids('dishanhai:light 100')
                .itemOutputs('1x dishanhai:photon')
                .EUt(8192)
                .duration(100)
        })


    }

     // ── 山海特大号标签过滤总线 ─────
    e.shaped('gt_shanhai:big_tag_filter_stock_bus', [
        'B  ',
        'S  ',
        'M  '
    ], {
        B: 'minecraft:book',
        S: "gtceu:tag_filter_me_stock_bus_part_machine",
        M: 'ae2:storage_bus'
    });

    safeAddRecipe('primordial_matter_recombination', 'gt_shanhai:primordial_matter_recombination', () => {
        gtr.primordial_matter_recombination('dishanhai:primordial_matter_recombination_')
            .itemInputs(
                '256x kubejs:hui_circuit_1',"128x kubejs:hui_circuit_2","64x kubejs:hui_circuit_3","32x kubejs:hui_circuit_4","64x gtceu:normal_optical_pipe","gtceu:computation_transmitter_hatch","gtceu:computation_receiver_hatch",
                "32x gtceu:high_performance_computation_array","64x gtceu:hpca_computation_component","64x gtceu:hpca_heat_sink_component","64x gtceu:hpca_heat_sink_component",
            )
            .itemOutputs(
                "gt_shanhai:logical_compute_hatch"
            )
            .EUt(luv)
            .duration(20)
    })
    safeAddRecipe('primitive_blast_furnace','dishanhai:primitive_blast_furnace_', () => {
        gtr.primitive_blast_furnace('dishanhai:primitive_blast_furnace_')
            .itemInputs(
                "64x gtceu:dimensionally_transcendent_dirt_forge",
                "64x gtceu:dimensionally_transcendent_steam_oven",
                "64x gtceu:primitive_void_ore"
            )
            .itemOutputs(
                "gt_shanhai:primordial_omega_engine"
            )
            .duration(20)
     })
     

gtr.primordial_matter_recombination('dishanhai:primordial_matter_recombination')
            .itemInputs(
                '256x kubejs:hui_circuit_1',"128x kubejs:hui_circuit_2","64x kubejs:hui_circuit_3","32x kubejs:hui_circuit_4","64x gtceu:normal_optical_pipe","gtceu:computation_transmitter_hatch","gtceu:computation_receiver_hatch",
                "32x gtceu:high_performance_computation_array","64x gtceu:hpca_computation_component","64x gtceu:hpca_heat_sink_component","64x gtceu:hpca_heat_sink_component",
            )
            .itemOutputs(
                "gt_shanhai:logical_compute_hatch"
            )
            .EUt(luv)
            .duration(20)
            


    // ========== 伟哥罐子30倍组装机产出 ==========
    const assemblerRecipes = [
        { id: 'heidonqidian', type:'qft', name: '黑洞奇点组装',circuit:1,notConsumable:'16x gtladditions:forge_of_the_antichrist', itemInputs: ['kubejs:naquadria_charge','64x kubejs:time_dilation_containment_unit','64x kubejs:charged_triplet_neutronium_sphere'], itemOutputs: ['1920x kubejs:contained_reissner_nordstrom_singularity'], EUt:uxv },
        { id: 'qiyiqid', name: '奇异物质组装', circuit:2,notConsumable:'16x gtladditions:forge_of_the_antichrist',itemInputs: ['15x gtceu:degenerate_rhenium_dust','kubejs:leptonic_charge','kubejs:contained_high_density_protonic_matter'], itemOutputs: ['30x kubejs:contained_exotic_matter'], EUt: UXV },
        { id: 'gaomiduqidian', type:'qft', name: '高密度物质组装',circuit:3,notConsumable:'16x gtladditions:forge_of_the_antichrist', itemInputs: ['kubejs:leptonic_charge','kubejs:time_dilation_containment_unit','kubejs:charged_triplet_neutronium_sphere'], itemOutputs: ['30x kubejs:contained_high_density_protonic_matter'], EUt: UXV },
        { id: 'niumanheidonqidian', type:'qft', name: '克尔纽曼奇点组装',circuit:4,notConsumable:'16x gtladditions:forge_of_the_antichrist' ,itemInputs: ['kubejs:time_dilation_containment_unit','64x kubejs:charged_triplet_neutronium_sphere'], inputFluids: ['gtceu:uu_matter 10000'], itemOutputs: ['30x kubejs:contained_kerr_newmann_singularity'], EUt: UXV }
        
    ];
    
    assemblerRecipes.forEach(recipe => {
        var machineType = recipe.type || 'assembler';
        safeAddRecipe(machineType, `dishanhai:${recipe.id}`, () => {
            buildRecipe(gtr[machineType](`dishanhai:${recipe.id}`), recipe);
        });
    });
    
    // 通用高级配方
    const suprecipes_1 = [
        { id: 'distort_water',type: 'distort',notConsumableFluid: ['gtceu:grade_16_purified_water'],inputFluids: ['minecraft:water 223372036854775807'],
            outputFluids: [
                'gtceu:oxygen 4611686001827388',
                'gtceu:hydrogen 4611686001827388',
                'gtceu:carbon_dioxide 21474836470000',
                'gtceu:carbon_monoxide 2147483647'
            ],EUt: mv,duration: 20
        },// ========== 扭曲电解配方 ==========
        {id:'dimensionally_transcendent_plasma_forge_konghshao',type:'stellar_forge',circuit:20,notConsumable:['dishanhai:god_forge_mod'],inputFluids:['minecraft:water 1000'],itemOutputs:['96x dishanhai:hxsp','128x avaritia:neutron_pile'],outputFluids:['gtceu:grade_16_purified_water 30000','gtceu:oxygen 20000','gtceu:hydrogen 20000','gtceu:dimensionallytranscendentresidue 50000','gtceu:raw_star_matter_plasma 50000','gtceu:spacetime 50000','gtceu:cosmic_element 30000','gtceu:neutronium 10000','gtceu:uu_matter 10000'],EUt:lv,duration:20,blastFurnaceTemp:10000},
        {id:'god_forge_mod',type:'assembler_module',itemInputs:['16x gtladditions:forge_of_the_antichrist','dishanhai:wzcz3','256x gtladditions:astral_array', '128x dishanhai:cosmic_probe_mk','102400x gtceu:cosmic_ingot','64x gtladditions:heart_of_the_universe','102400x gtladditions:strange_annihilation_fuel_rod','10240x gtladditions:black_hole_seed','64x gtladditions:macro_atomic_resonant_fragment_stripper','102400x gtlcore:miracle_crystal','32x gtladditions:thread_modifier_hatch','16x gtladditions:heliofusion_exoticizer','16x gtladditions:helioflare_power_forge','16x gtladditions:heliofluix_melting_core','16x gtladditions:heliothermal_plasma_fabricator','16x gtladditions:heliophase_leyline_crystallizer']
             ,inputFluids:['gtceu:uu_matter 2147483647','gtceu:eternity 2147483647','gtceu:cosmicneutronium 2147483647','gtceu:miracle 2147483647'],itemOutputs:['dishanhai:god_forge_mod'],EUt:65565*max,duration:1200
        },//伟哥模块配方
        {id:'suprachronal_assembly_line_time_reversal_protocol',type:'suprachronal_assembly_line',itemInputs:['4x gtladditions:arcanic_astrograph','4096x gtladditions:astral_array','256x dishanhai:wzcz3','256x gtladditions:thread_modifier_hatch','128x kubejs:supracausal_computer','715827882x kubejs:temporal_matter','715827882x kubejs:timepiece','5024x gtlcore:max_field_generator','2560x kubejs:supracausal_mainframe'],inputFluids:['gtceu:temporalfluid 46080000','gtceu:primordialmatter 46080000','gtceu:magnetohydrodynamicallyconstrainedstarmatter 46080000','gtceu:chaos 46080000'],itemOutputs:['dishanhai:time_reversal_protocol'],EUt:2048*opv,duration:20}
        
    ];
    
    let supSuccess = 0;
    let supFailed = 0;
    
    // 统一处理
    suprecipes_1.forEach(recipe => {
        if (!gtr[recipe.type]) {
            console.error(`❌ 未知机器类型: ${recipe.type}`);
            return;
        }
        let result = safeAddRecipe(`${recipe.type}`, `dishanhai:${recipe.id}`, () => {
            buildRecipe(gtr[recipe.type](`dishanhai:${recipe.id}`), recipe);
        });
        if (result) { supSuccess++; } else { supFailed++; }
    })


// ========== 分子解构配方组 ==========
console.log(`🔓 开始加载分子解构配方`)

const molecularRecipes = [
    { id: 'ytyh', name: '时空粉解构', itemInputs: ['gtceu:spacetime_dust'], outputFluids: ['gtceu:spacetime 144'], EUt: opv },
    { id: 'ciyues', name: '恒星磁流体解构', itemInputs: ['gtceu:magnetohydrodynamicallyconstrainedstarmatter_block'], outputFluids: ['gtceu:magnetohydrodynamicallyconstrainedstarmatter 1296'], EUt:max },
    { id: 'ytciwuz', name: '磁物质解构', itemInputs: ['gtceu:magmatter_dust'], outputFluids: ['gtceu:magmatter 144'], EUt: 2147483647 },
    {id:'magnetohydrodynamicallyconstrainedstarmatter_dust',name:'磁流体约束恒星物质解构',itemInputs:['gtceu:magnetohydrodynamicallyconstrainedstarmatter_dust'],outputFluids:['gtceu:magnetohydrodynamicallyconstrainedstarmatter 144'],EUt:max}
];

var molecularOk = 0;
var molecularFail = 0;
for (var mi = 0; mi < molecularRecipes.length; mi++) {
    var r = molecularRecipes[mi];
    try {
        var m = gtr.molecular_deconstruction('dishanhai:' + r.id);
        buildRecipe(m, r);
        molecularOk++;
    } catch (e) {
        molecularFail++;
    }
}
console.log(`🗓️ 分子解构配方统计:成功 ${molecularOk}个，失败${molecularFail}个`);

    // ========== 研磨机配方 ==========
    //=======基岩粉========
    safeAddRecipe('macerator', 'dishanhai:jiyangf', () => {
        gtr.macerator('dishanhai:jiyangf')
            .itemInputs('minecraft:bedrock')
            .itemOutputs('4x gtceu:bedrock_dust')
            .EUt(ULV)
            .duration(20);
    });
    
    // ========== 压缩机配方组 ==========
    const compressorRecipes = [
        { id: 'tiny_magmatter_dust', name: '磁物质粉压缩1', itemInputs: ['9x gtceu:tiny_magmatter_dust'], itemOutputs: ['gtceu:small_magmatter_dust'], EUt: 2147483 },
        { id: 'magmatter_dust', name: '磁物质粉压缩2', itemInputs: ['9x gtceu:small_magmatter_dust'], itemOutputs: ['gtceu:magmatter_dust'], EUt: 21474836 }
    ];
    let compressorSuccess=0;
    let compressorFailed=0;

    for (var ci = 0; ci < compressorRecipes.length; ci++) {
        var r = compressorRecipes[ci];
        var result = safeAddRecipe('compressor', 'dishanhai:' + r.id, function() {
            buildRecipe(gtr.compressor('dishanhai:' + r.id), r);
        });
        result ? compressorSuccess++ : compressorFailed++;
    }
    console.log(`🗓️ 压缩机配方统计：成功 ${compressorSuccess} | 失败 ${compressorFailed}`)
    
    // ========== 钻井模块配方 ==========
    safeAddRecipe('drilling_module', 'dishanhai:spacetime', () => {
        gtr.drilling_module('dishanhai:spacetime')
            .circuit(31)
            .notConsumable('kubejs:space_drone_mk3')
            .inputFluids('gtceu:rocket_fuel_rp_1 1000')
            .outputFluids('gtceu:spacetime 10000')
            .EUt(uev)
            .duration(20);
    });
    
    // ========== 应用通量模组配方 ==========
    if(Platform.isLoaded('appflux')){
        safeAddRecipe('assembler', 'dishanhai:flux_256m', () => {
            gtr.assembler('dishanhai:fe_256m_cell')
                .notConsumable('dishanhai:wzcz1')
                .itemInputs('gtlcore:cell_component_256m','kubejs:wyvern_energy_core')
                .itemOutputs('appflux:fe_256m_cell')
                .EUt(ULV)
                .duration(20);
        });
        safeAddRecipe('assembler', 'dishanhai:flux_accessor', () => {
            gtr.assembler('dishanhai:tlfwd')
                .notConsumable('dishanhai:wzcz1')
                .itemInputs('kubejs:draconium_block_charged')
                .itemOutputs('appflux:flux_accessor')
                .duration(20)
                .EUt(ULV);
            e.remove({output:'appflux:flux_accessor'});
        });
    } else {
        debug('appflux 模组未加载，跳过相关配方');
    }


        //虚空虹吸矩阵 voidflux_reaction
    const recipes_voidfluxs=[
        {id:'gelid_cryotheum',type:'voidflux_reaction',notConsumable:'64x kubejs:dust_cryotheum'
        ,circuit:1
        ,outputFluids: ['kubejs:gelid_cryotheum 1000'],EUt:zpm}
    ]
let voidfluxSuccess =0
let voidfluxFailed  =0

recipes_voidfluxs.forEach(function(r) {
    var result = safeAddRecipe(r.type, 'dishanhai:' + r.id, function() {
        buildRecipe(gtr[r.type]('dishanhai:' + r.id), r);
    });
    result ? voidfluxSuccess++ : voidfluxFailed++;
}); 


var ForgeRegistries = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')
var plasma_output = []
ForgeRegistries.FLUIDS.getKeys().forEach(function(key) {
    var id = key.toString()
    if (Fluid.of(id).hasTag('forge:plasmas') && id !== 'gtladditions:creon_plasma' && id !== 'gtceu:instability_plasma') {
        plasma_output.push(id)
    }
})
var plasma_output_ingredient = plasma_output.map(id => id + ' 131072000')
var plasma_output_ingredient_2 = ['gtceu:eternity 131072000','gtceu:cosmicneutronium 131072000']
const plasma_output_ingredient_3 = plasma_output_ingredient.concat(plasma_output_ingredient_2)
global.plasma_output_output = plasma_output_ingredient_3


global.black_hole =  ['gtceu:magmatter 131072000','gtceu:spatialfluid 131072000','gtladditions:phonon_crystal_solution 131072000','gtceu:temporalfluid 131072000','gtceu:cosmicneutronium 131072000','gtceu:magnetohydrodynamicallyconstrainedstarmatter 131072000','gtladditions:phonon_medium 131072000','gtceu:chaos 131072000','gtceu:primordialmatter 131072000','gtceu:mana 131072000','gtceu:white_dwarf_mtter 131072000','gtceu:black_dwarf_mtter 131072000','gtceu:starlight 131072000','gtceu:instability 131072000','gtceu:infinity 131072000','gtceu:cosmic_element 131072000','gtceu:neutronium 131072000','gtceu:eternity 131072000','gtceu:miracle 131072000','gtceu:spacetime 131072000']
    if (Platform.isLoaded('gtl_extend')){

    
    //黑洞物质剥离配方
    safeAddRecipe('horizon_matter_decompression', 'dishanhai:heidon', () => {
    let formula = gtr.horizon_matter_decompression('dishanhai:heidon')
        .itemInputs('dishanhai:hxsp')            
        formula.outputFluids.apply(formula, global.black_hole)
        formula.duration(1200);
    });


    safeAddRecipe('large_void_pump', 'dishanhai:argon', () => {
        gtr.large_void_pump('dishanhai:argon')
            .circuit(15)
            .outputFluids('gtceu:argon 100000')
            .duration(20)
            .EUt(ev);
    });
    
    var voidPumps = [
        { id: 'air', circuit: 16, output: 'gtceu:air 2147483647' },
        { id: 'nether_air', circuit: 17, output: 'gtceu:nether_air 2147483647' },
        { id: 'ender_air', circuit: 18, output: 'gtceu:ender_air 2147483647' },
        { id: 'barnarda_air', circuit: 19, output: 'gtceu:barnarda_air 2147483647' }
    ];
    
    for (var i = 0; i < voidPumps.length; i++) {
        var pump = voidPumps[i];
        safeAddRecipe('large_void_pump', 'dishanhai:' + pump.id, (function(p) {
            return function() {
                gtr.large_void_pump('dishanhai:' + p.id)
                    .circuit(p.circuit)
                    .outputFluids(p.output)
                    .EUt(ev)
                    .duration(20);
            };
        })(pump));
    }}
    

    // ========== Mekanism 创造级配方 ==========
    if (Platform.isLoaded('mekanism')){
        safeAddRecipe('assembler', 'dishanhai:cznlyj', () => {
            gtr.assembler('dishanhai:cznlyj')
                .itemInputs('102400x gtladditions:god_forge_energy_casing')
                .itemOutputs(Item.of('mekanism:creative_energy_cube', '{mekData:{EnergyContainers:[{Container:0b,stored:"18446744073709551615.9999"}],componentConfig:{config0:{side0:4,side1:4,side2:4,side3:4,side4:4,side5:4}}}}'))
                .EUt(MAX)
                .duration(20);
        });
        safeAddRecipe('assembler', 'dishanhai:czcg', () => {
            gtr.assembler('dishanhai:czcg')
                .notConsumable('dishanhai:wzcz3')
                .itemInputs('kubejs:suprachronal_mainframe_complex')
                .itemOutputs('mekanism:creative_fluid_tank')
                .EUt(MAX)
                .duration(20);
        });
    }
    
    // ========== 通量网络配方 ==========
    if (Platform.isLoaded('fluxnetworks')){
        safeAddRecipe('assembler', 'dishanhai:flux_dust', () => {
            gtr.assembler('dishanhai:flux_dust')
                .notConsumable('dishanhai:wzcz1')
                .itemInputs('64x minecraft:redstone','minecraft:obsidian')
                .itemOutputs('64x fluxnetworks:flux_dust')
                .EUt(ulv)
                .duration(20);
        });
        }
const cosmos_item_output = ["2147483647x gtceu:carbon_dust", "2147483647x gtceu:phosphorus_dust", "2147483647x ae2:fluix_dust","2147483647x gtceu:certus_quartz_dust", "2147483647x avaritia:neutron_pile", "2147483647x gtceu:damascus_steel_dust","2147483647x gtceu:bedrock_dust", "2147483647x gtceu:quantanium_dust", "2147483647x gtceu:purified_tengam_dust","2147483647x minecraft:netherite_scrap", "2147483647x gtceu:bloodstone_dust", "2147483647x gtceu:alien_algae_dust","2147483647x gtceu:force_dust", "2147483647x gtceu:uruium_dust", "2147483647x gtceu:tartarite_dust","2147483647x gtceu:ignis_crystal_dust", "2147483647x gtceu:earth_crystal_dust", "2147483647x gtceu:perditio_crystal_dust","2147483647x gtceu:uranium_235_dust", "2147483647x gtceu:copper76_dust", "2147483647x gtceu:titanium_50_dust","2147483647x gtceu:plutonium_241_dust", "2147483647x gtceu:trinium_dust", "2147483647x ae2:sky_dust","2147483647x gtceu:black_dwarf_mtter_dust", "2147483647x gtceu:white_dwarf_mtter_dust", "2147483647x gtceu:sulfur_dust","2147483647x gtceu:selenium_dust", "2147483647x gtceu:iodine_dust", "2147483647x gtceu:boron_dust","2147483647x gtceu:silicon_dust", "2147483647x gtceu:germanium_dust", "2147483647x gtceu:arsenic_dust","2147483647x gtceu:antimony_dust", "2147483647x gtceu:tellurium_dust", "2147483647x gtceu:astatine_dust","2147483647x gtceu:aluminium_dust", "2147483647x gtceu:gallium_dust", "2147483647x gtceu:indium_dust","2147483647x gtceu:tin_dust", "2147483647x gtceu:thallium_dust", "2147483647x gtceu:lead_dust","2147483647x gtceu:bismuth_dust", "2147483647x gtceu:polonium_dust", "2147483647x gtceu:titanium_dust","2147483647x gtceu:vanadium_dust", "2147483647x gtceu:chromium_dust", "2147483647x gtceu:manganese_dust","2147483647x gtceu:iron_dust", "2147483647x gtceu:cobalt_dust", "2147483647x gtceu:nickel_dust","2147483647x gtceu:copper_dust", "2147483647x gtceu:zinc_dust", "2147483647x gtceu:zirconium_dust","2147483647x gtceu:niobium_dust", "2147483647x gtceu:molybdenum_dust", "2147483647x gtceu:technetium_dust","2147483647x gtceu:ruthenium_dust", "2147483647x gtceu:rhodium_dust", "2147483647x gtceu:palladium_dust","2147483647x gtceu:silver_dust", "2147483647x gtceu:cadmium_dust", "2147483647x gtceu:hafnium_dust","2147483647x gtceu:tantalum_dust", "2147483647x gtceu:tungsten_dust", "2147483647x gtceu:rhenium_dust","2147483647x gtceu:osmium_dust", "2147483647x gtceu:iridium_dust", "2147483647x gtceu:platinum_dust","2147483647x gtceu:gold_dust", "2147483647x gtceu:beryllium_dust", "2147483647x gtceu:magnesium_dust","2147483647x gtceu:calcium_dust", "2147483647x gtceu:strontium_dust", "2147483647x gtceu:barium_dust","2147483647x gtceu:radium_dust", "2147483647x gtceu:yttrium_dust", "2147483647x gtceu:lithium_dust","2147483647x gtceu:sodium_dust", "2147483647x gtceu:potassium_dust", "2147483647x gtceu:rubidium_dust","2147483647x gtceu:caesium_dust", "2147483647x gtceu:francium_dust", "2147483647x gtceu:scandium_dust","2147483647x gtceu:actinium_dust", "2147483647x gtceu:thorium_dust", "2147483647x gtceu:protactinium_dust","2147483647x gtceu:uranium_dust", "2147483647x gtceu:neptunium_dust", "2147483647x gtceu:plutonium_dust","2147483647x gtceu:americium_dust", "2147483647x gtceu:curium_dust", "2147483647x gtceu:berkelium_dust","2147483647x gtceu:californium_dust", "2147483647x gtceu:einsteinium_dust", "2147483647x gtceu:fermium_dust","2147483647x gtceu:mendelevium_dust", "2147483647x gtceu:nobelium_dust", "2147483647x gtceu:lawrencium_dust","2147483647x gtceu:lanthanum_dust", "2147483647x gtceu:cerium_dust", "2147483647x gtceu:praseodymium_dust","2147483647x gtceu:neodymium_dust", "2147483647x gtceu:promethium_dust", "2147483647x gtceu:samarium_dust","2147483647x gtceu:europium_dust", "2147483647x gtceu:gadolinium_dust", "2147483647x gtceu:terbium_dust","2147483647x gtceu:dysprosium_dust", "2147483647x gtceu:holmium_dust", "2147483647x gtceu:erbium_dust","2147483647x gtceu:thulium_dust", "2147483647x gtceu:ytterbium_dust", "2147483647x gtceu:lutetium_dust","2147483647x gtceu:rutherfordium_dust", "2147483647x gtceu:dubnium_dust", "2147483647x gtceu:seaborgium_dust","2147483647x gtceu:bohrium_dust", "2147483647x gtceu:hassium_dust", "2147483647x gtceu:meitnerium_dust","2147483647x gtceu:darmstadtium_dust", "2147483647x gtceu:roentgenium_dust", "2147483647x gtceu:copernicium_dust","2147483647x gtceu:nihonium_dust", "2147483647x gtceu:flerovium_dust", "2147483647x gtceu:moscovium_dust","2147483647x gtceu:livermorium_dust", "2147483647x gtceu:tennessine_dust", "2147483647x gtceu:oganesson_dust","2147483647x gtceu:jasper_dust", "2147483647x gtceu:naquadah_dust", "2147483647x gtceu:enriched_naquadah_dust","2147483647x gtceu:naquadria_dust", "2147483647x gtceu:duranium_dust", "2147483647x gtceu:tritanium_dust","2147483647x gtceu:mithril_dust", "2147483647x gtceu:orichalcum_dust", "2147483647x gtceu:enderium_dust","2147483647x gtceu:adamantine_dust", "2147483647x gtceu:vibranium_dust", "2147483647x gtceu:infuscolium_dust","2147483647x gtceu:taranium_dust", "2147483647x gtceu:draconium_dust", "2147483647x gtceu:starmetal_dust","2147483647x gtceu:exquisite_red_garnet_gem", "2147483647x gtceu:exquisite_blue_topaz_gem","2147483647x gtceu:exquisite_emerald_gem", "2147483647x gtceu:exquisite_olivine_gem","2147483647x gtceu:exquisite_yellow_garnet_gem", "2147483647x gtceu:exquisite_certus_quartz_gem","2147483647x gtceu:exquisite_coal_gem", "2147483647x gtceu:exquisite_quartzite_gem","2147483647x gtceu:exquisite_grossular_gem", "2147483647x gtceu:exquisite_sodalite_gem","2147483647x gtceu:exquisite_lazurite_gem", "2147483647x gtceu:exquisite_rock_salt_gem","2147483647x gtceu:exquisite_lapis_gem", "2147483647x gtceu:exquisite_almandine_gem","2147483647x gtceu:exquisite_salt_gem", "2147483647x gtceu:exquisite_nether_quartz_gem","2147483647x gtceu:exquisite_monazite_gem", "2147483647x gtceu:exquisite_pyrope_gem","2147483647x gtceu:exquisite_spessartine_gem", "2147483647x gtceu:exquisite_apatite_gem","2147483647x gtceu:exquisite_opal_gem", "2147483647x gtceu:exquisite_ruby_gem","2147483647x gtceu:exquisite_green_sapphire_gem", "2147483647x gtceu:exquisite_realgar_gem","2147483647x gtceu:exquisite_cinnabar_gem", "2147483647x gtceu:exquisite_jasper_gem","2147483647x gtceu:exquisite_malachite_gem", "2147483647x gtceu:exquisite_diamond_gem","2147483647x gtceu:exquisite_sapphire_gem", "2147483647x gtceu:exquisite_amethyst_gem","2147483647x gtceu:exquisite_topaz_gem","2147483647x gtceu:flawless_spessartine_gem", "2147483647x gtceu:flawless_quartzite_gem","2147483647x gtceu:flawless_nether_quartz_gem", "2147483647x gtceu:flawless_certus_quartz_gem","2147483647x gtceu:flawless_red_garnet_gem", "2147483647x gtceu:flawless_sodalite_gem","2147483647x gtceu:flawless_monazite_gem", "2147483647x gtceu:flawless_salt_gem","2147483647x gtceu:flawless_apatite_gem", "2147483647x gtceu:flawless_almandine_gem","2147483647x gtceu:flawless_coal_gem", "2147483647x gtceu:flawless_lazurite_gem","2147483647x gtceu:flawless_pyrope_gem", "2147483647x gtceu:flawless_rock_salt_gem","2147483647x gtceu:flawless_grossular_gem", "2147483647x gtceu:flawless_opal_gem","2147483647x gtceu:flawless_amethyst_gem", "2147483647x gtceu:flawless_topaz_gem","2147483647x gtceu:flawless_jasper_gem", "2147483647x gtceu:flawless_malachite_gem","2147483647x gtceu:flawless_cinnabar_gem", "2147483647x gtceu:flawless_ruby_gem","2147483647x gtceu:flawless_green_sapphire_gem", "2147483647x gtceu:flawless_sapphire_gem","2147483647x gtceu:flawless_diamond_gem", "2147483647x gtceu:flawless_realgar_gem","2147483647x gtceu:flawless_lapis_gem", "2147483647x gtceu:flawless_yellow_garnet_gem","2147483647x gtceu:flawless_olivine_gem", "2147483647x gtceu:flawless_emerald_gem","2147483647x gtceu:flawless_blue_topaz_gem","2147483647x gtceu:pyrope_gem", "2147483647x gtceu:realgar_gem", "2147483647x minecraft:lapis_lazuli","2147483647x gtceu:topaz_gem", "2147483647x gtceu:yellow_garnet_gem", "2147483647x minecraft:quartz","2147483647x gtceu:malachite_gem", "2147483647x gtceu:rock_salt_gem", "2147483647x gtceu:sodalite_gem","2147483647x gtceu:cinnabar_gem", "2147483647x gtceu:olivine_gem", "2147483647x minecraft:coal","2147483647x gtceu:monazite_gem", "2147483647x gtceu:opal_gem", "2147483647x gtceu:salt_gem","2147483647x gtceu:quartzite_gem", "2147483647x gtceu:jasper_gem", "2147483647x gtceu:apatite_gem","2147483647x minecraft:amethyst_shard", "2147483647x gtceu:ruby_gem", "2147483647x gtceu:red_garnet_gem","2147483647x minecraft:emerald", "2147483647x gtceu:green_sapphire_gem", "2147483647x gtceu:sapphire_gem","2147483647x gtceu:lazurite_gem", "2147483647x gtceu:blue_topaz_gem", "2147483647x gtceu:certus_quartz_gem","2147483647x gtceu:andradite_gem", "2147483647x gtceu:grossular_gem", "2147483647x minecraft:diamond","2147483647x gtceu:almandine_gem", "2147483647x gtceu:spessartine_gem","2147483647x gtceu:silicon_dioxide_dust", "2147483647x gtceu:mica_dust", "2147483647x gtceu:trinium_compound_dust","2147483647x gtceu:trona_dust", "2147483647x gtceu:celestine_dust", "2147483647x gtceu:malachite_dust","2147483647x gtceu:endstone_dust", "2147483647x gtceu:ender_pearl_dust", "2147483647x gtceu:cinnabar_dust","2147483647x gtceu:olivine_dust", "2147483647x gtceu:bastnasite_dust", "2147483647x gtceu:cobalt_oxide_dust","2147483647x gtceu:pitchblende_dust", "2147483647x gtceu:zeolite_dust", "2147483647x gtceu:oilsands_dust","2147483647x gtceu:infused_gold_dust", "2147483647x gtceu:uraninite_dust", "2147483647x gtceu:alunite_dust","2147483647x gtceu:galena_dust", "2147483647x gtceu:sodalite_dust", "2147483647x gtceu:calcite_dust","2147483647x gtceu:bornite_dust", "2147483647x gtceu:desh_dust", "2147483647x gtceu:rock_salt_dust","2147483647x gtceu:antimony_trioxide_dust", "2147483647x gtceu:nether_quartz_dust", "2147483647x gtceu:rare_earth_dust","2147483647x gtceu:rare_earth_metal_dust", "2147483647x gtceu:adamantine_compounds_dust", "2147483647x gtceu:amethyst_dust","2147483647x gtceu:ostrum_dust", "2147483647x gtceu:ruby_dust", "2147483647x gtceu:red_garnet_dust","2147483647x minecraft:redstone", "2147483647x gtceu:electrotine_dust", "2147483647x gtceu:lazurite_dust","2147483647x gtceu:blue_topaz_dust", "2147483647x gtceu:cooperite_dust", "2147483647x gtceu:hematite_dust","2147483647x gtceu:pyrolusite_dust", "2147483647x gtceu:cobaltite_dust", "2147483647x gtceu:molybdenite_dust","2147483647x gtceu:chalcocite_dust", "2147483647x gtceu:stibnite_dust", "2147483647x gtceu:kyanite_dust","2147483647x gtceu:sapphire_dust", "2147483647x gtceu:magnesite_dust", "2147483647x minecraft:glowstone_dust","2147483647x gtceu:granitic_mineral_sand_dust", "2147483647x gtceu:bentonite_dust", "2147483647x gtceu:calorite_dust","2147483647x gtceu:green_sapphire_dust", "2147483647x gtceu:emerald_dust", "2147483647x gtceu:paper_dust","2147483647x gtceu:soda_ash_dust", "2147483647x gtceu:zincite_dust", "2147483647x gtceu:apatite_dust","2147483647x gtceu:tricalcium_phosphate_dust", "2147483647x gtceu:phosphate_dust", "2147483647x gtceu:goethite_dust","2147483647x gtceu:samarium_refined_powder_dust", "2147483647x gtceu:vanadium_magnetite_dust","2147483647x gtceu:andradite_dust", "2147483647x gtceu:powellite_dust", "2147483647x gtceu:wulfenite_dust","2147483647x gtceu:tantalite_dust", "2147483647x gtceu:massicot_dust", "2147483647x gtceu:diamond_dust","2147483647x gtceu:tungstate_dust", "2147483647x gtceu:ilmenite_dust", "2147483647x gtceu:uvarovite_dust","2147483647x gtceu:grossular_dust", "2147483647x gtceu:barite_dust", "2147483647x gtceu:rutile_dust","2147483647x gtceu:bauxite_dust", "2147483647x gtceu:chromite_dust", "2147483647x gtceu:pollucite_dust","2147483647x gtceu:spessartine_dust", "2147483647x gtceu:pyrope_dust", "2147483647x gtceu:pentlandite_dust","2147483647x gtceu:sphalerite_dust", "2147483647x gtceu:realgar_dust", "2147483647x gtceu:cassiterite_dust","2147483647x gtceu:cassiterite_sand_dust", "2147483647x gtceu:spodumene_dust", "2147483647x gtceu:lepidolite_dust","2147483647x gtceu:lapis_dust", "2147483647x gtceu:topaz_dust", "2147483647x gtceu:yellow_garnet_dust","2147483647x gtceu:yellow_limonite_dust", "2147483647x gtceu:pyrite_dust", "2147483647x gtceu:chalcopyrite_dust","2147483647x gtceu:clay_dust", "2147483647x gtceu:tetrahedrite_dust", "2147483647x gtceu:raw_tengam_dust","2147483647x gtceu:platinum_group_sludge_dust"]
global.cosmos_output_items = cosmos_item_output
let cosmos_fluid_output = ["gtceu:spacetime 2147483647", "gtceu:raw_star_matter_plasma 2147483647", "gtceu:quark_gluon_plasma 2147483647","gtceu:heavy_quark_degenerate_matter_plasma 2147483647", "gtceu:neutronium 2147483647", "gtceu:heavy_lepton_mixture 2147483647","gtceu:hydrogen 2147483647", "gtceu:nitrogen 2147483647", "gtceu:oxygen 2147483647", "gtceu:fluorine 2147483647","gtceu:chlorine 2147483647", "gtceu:bromine 2147483647", "gtceu:helium 2147483647", "gtceu:neon 2147483647","gtceu:argon 2147483647", "gtceu:krypton 2147483647", "gtceu:xenon 2147483647", "gtceu:radon 2147483647","gtceu:mercury 2147483647", "gtceu:deuterium 2147483647", "gtceu:tritium 2147483647", "gtceu:helium_3 2147483647","gtceu:unknowwater 2147483647", "gtceu:uu_matter 2147483647", "gtceu:argon_plasma 2147483647","gtceu:echoite_plasma 2147483647", "gtceu:legendarium_plasma 2147483647", "gtceu:metastable_hassium_plasma 2147483647","gtceu:degenerate_rhenium_plasma 2147483647", "gtceu:celestialtungsten_plasma 2147483647", "gtceu:chaos_plasma 2147483647","gtceu:starmetal_plasma 2147483647", "gtceu:enderium_plasma 2147483647", "gtceu:oxygen_plasma 2147483647","gtceu:nitrogen_plasma 2147483647", "gtceu:orichalcum_plasma 2147483647", "gtceu:quasifissioning_plasma 2147483647","gtceu:vibranium_plasma 2147483647", "gtceu:astraltitanium_plasma 2147483647", "gtceu:cosmic_mesh_plasma 2147483647","gtceu:taranium_rich_liquid_helium_4_plasma 2147483647", "gtceu:dense_neutron_plasma 2147483647","gtceu:draconiumawakened_plasma 2147483647", "gtceu:nickel_plasma 2147483647", "gtceu:infuscolium_plasma 2147483647","gtceu:flyb_plasma 2147483647", "gtceu:high_energy_quark_gluon_plasma 2147483647","gtceu:quantumchromodynamically_confined_matter_plasma 2147483647", "gtceu:plutonium_241_plasma 2147483647","gtceu:iron_plasma 2147483647", "gtceu:silver_plasma 2147483647", "gtceu:actinium_superhydride_plasma 2147483647","gtceu:crystalmatrix_plasma 2147483647", "gtceu:mithril_plasma 2147483647", "gtceu:adamantium_plasma 2147483647","gtceu:helium_plasma 2147483647", "gtceu:mana 2147483647"]
global.cosmos_fluid_output = cosmos_fluid_output
//==============  通用配方 =================(wx,wuxian,♾️,wx)
var dishanhai_timer = DShanhaiRecipeEngine.startTimer('山海的♾️物品配方');

let cosmos_simulation_list = [ "131072x gtceu:white_dwarf_mtter_dust",'131072x gtceu:infused_gold_dust',"131072x gtceu:black_dwarf_mtter_dust","131072x ae2:sky_dust","131072x gtceu:trinium_dust","131072x gtceu:plutonium_241_dust","131072x gtceu:titanium_50_dust","131072x gtceu:copper76_dust","131072x gtceu:uranium_235_dust","131072x gtceu:perditio_crystal_dust","131072x gtceu:earth_crystal_dust","131072x gtceu:ignis_crystal_dust","131072x gtceu:tartarite_dust","131072x gtceu:uruium_dust","131072x gtceu:force_dust","131072x gtceu:alien_algae_dust","131072x gtceu:bloodstone_dust","131072x minecraft:netherite_scrap","131072x gtceu:purified_tengam_dust","131072x gtceu:quantanium_dust","131072x gtceu:bedrock_dust","131072x gtceu:damascus_steel_dust","131072x avaritia:neutron_pile","131072x gtceu:certus_quartz_dust","131072x ae2:fluix_dust",'131072x gtceu:shirabon_dust',"131072x gtceu:rare_earth_metal_dust",'131072x gtceu:enderium_dust','131072x gtceu:uraninite_dust','131072x gtceu:diatomite_dust','131072x gtceu:bentonite_dust','131072x gtceu:endstone_dust','131072x gtceu:cassiterite_dust','131072x gtceu:bauxite_dust','131072x gtceu:sapphire_dust','131072x gtceu:spacetime_dust','1024000x kubejs:dust_cryotheum','102400x gtceu:celestial_secret_dust','102400x gtceu:tear_dust','1024000x gtceu:rare_earth_dust','1024000x gtceu:stem_cells','2048000x kubejs:biological_cells']
global.cosmos_simulation_output_items_1 = cosmos_simulation_list

let cosmos_simulation_list_hxsp =  ['10240x gtceu:small_eternity_dust','10240x kubejs:kinetic_matter','10240x kubejs:omni_matter','10240x kubejs:pellet_antimatter','10240x kubejs:amorphous_matter','10240x kubejs:corporeal_matter','10240x kubejs:essentia_matter','10240x kubejs:dark_matter','10240x kubejs:temporal_matter','10240x kubejs:void_matter','10240x gtceu:tiny_magmatter_dust','10240x kubejs:hypercube','10240x kubejs:quantum_anomaly','1x gtceu:magnetohydrodynamicallyconstrainedstarmatter_block','10240x gtceu:tiny_transcendentmetal_dust','10140x gtceu:tiny_infinity_dust','10240x kubejs:space_essence']
global.cosmos_simulation_output_items_hxsp = cosmos_simulation_list_hxsp
const dishanhairecipes = [
    {
        id: 'time_reversal_protocol_cosmos_plus',type: 'cosmos_simulation',notConsumable: ['dishanhai:time_reversal_protocol'],itemOutputs:global.cosmos_simulation_output_items,itemOutputs:global.cosmos_simulation_output_items_hxsp,inputFluids: ['minecraft:water 131002'],duration: 1200
    },//不要给Cosmos加eut 世线高级鸿蒙
    {
        id: 'time_reversal_protocol_stellar_forge_supercritical_steam',type: 'stellar_forge',notConsumable: 'dishanhai:time_reversal_protocol',circuit: 2,inputFluids: ['minecraft:water 10000'],outputFluids: ['gtceu:supercritical_steam 100000'],EUt:lv,duration: 20,addDataid: "SCTier",addData: 2
    },
    {
        id: 'time_reversal_protocol_stellar_forge_steam',type: 'stellar_forge',notConsumable: 'dishanhai:time_reversal_protocol',circuit: 1,inputFluids: ['minecraft:water 10000'],outputFluids: ['gtceu:steam 100000'],EUt:lv,duration: 20,addDataid: "SCTier",addData: 2
    },
    {id: 'cosmos_simulation_hxsp',type: 'cosmos_simulation',itemInputs:['16x dishanhai:hxsp'],itemOutputs:global.cosmos_simulation_output_items_hxsp,inputFluids: ['gtceu:raw_star_matter_plasma 102400'],duration: 1200
    }, //恒星碎片鸿蒙
    {
        id:'greythings_eoh_plus_cosmos_simulation_plus',type:'cosmos_simulation',inputFluids:['minecraft:water 102400'],itemInputs:['disksavior:quantum_chromodynamic_charge_super'],itemOutputs:["131072x gtceu:white_dwarf_mtter_dust",'131072x gtceu:infused_gold_dust',"131072x gtceu:black_dwarf_mtter_dust","131072x ae2:sky_dust","131072x gtceu:trinium_dust","131072x gtceu:plutonium_241_dust","131072x gtceu:titanium_50_dust","131072x gtceu:copper76_dust","131072x gtceu:uranium_235_dust","131072x gtceu:perditio_crystal_dust","131072x gtceu:earth_crystal_dust","131072x gtceu:ignis_crystal_dust","131072x gtceu:tartarite_dust","131072x gtceu:uruium_dust","131072x gtceu:force_dust","131072x gtceu:alien_algae_dust","131072x gtceu:bloodstone_dust","131072x minecraft:netherite_scrap","131072x gtceu:purified_tengam_dust","131072x gtceu:quantanium_dust","131072x gtceu:bedrock_dust","131072x gtceu:damascus_steel_dust","131072x avaritia:neutron_pile","131072x gtceu:certus_quartz_dust","131072x ae2:fluix_dust",'131072x gtceu:shirabon_dust',"131072x gtceu:rare_earth_metal_dust",'131072x gtceu:enderium_dust','131072x gtceu:uraninite_dust','131072x gtceu:diatomite_dust','131072x gtceu:bentonite_dust','131072x gtceu:endstone_dust','131072x gtceu:cassiterite_dust','131072x gtceu:bauxite_dust','131072x gtceu:sapphire_dust','131072x gtceu:spacetime_dust','10240x kubejs:dust_cryotheum','102400x gtceu:celestial_secret_dust','102400x gtceu:tear_dust','1024000x gtceu:rare_earth_dust','1024000x gtceu:stem_cells','1024000x kubejs:biological_cells'],duration:1200
    },
    {
        id:'miracle_cosmos',defaultEnabled:false,type:'cosmos_simulation',itemInputs:['gtlcore:miracle_crystal'],itemOutputs:['2147483647x gtlcore:world_fragments_overworld','2147483647x gtlcore:world_fragments_nether','2147483647x gtlcore:world_fragments_end','2147483647x gtlcore:world_fragments_reactor','2147483647x gtlcore:world_fragments_enceladus','2147483647x gtlcore:world_fragments_titan','2147483647x gtlcore:world_fragments_glacio','2147483647x gtlcore:world_fragments_barnarda','2147483647x gtlcore:world_fragments_moon','2147483647x gtlcore:world_fragments_mars','2147483647x gtlcore:world_fragments_venus','2147483647x gtlcore:world_fragments_mercury','2147483647x gtlcore:world_fragments_ceres','2147483647x gtlcore:world_fragments_ganymede','2147483647x gtlcore:world_fragments_pluto','2147483647x gtlcore:mining_crystal','2147483647x gtlcore:treasures_crystal','16x gtceu:nan_certificate','16x kubejs:overworld_data','16x kubejs:nether_data','16x kubejs:end_data'],inputFluids:['minecraft:water 102400'],duration:1200
    },
    //奇迹鸿蒙
    {
        id:'qft_chaos_containment_unit',type:'qft',itemInputs:['kubejs:chaos_shard',],notConsumable:['gtceu:cosmicneutronium_nanoswarm'],itemOutputs:['15x kubejs:chaos_containment_unit','kubejs:time_dilation_containment_unit'],inputFluids:['gtceu:raw_star_matter_plasma'],notConsumable:'16x gtladditions:forge_of_the_antichrist',duration:20,EUt:opv
    },
    {
        id:'qft_cosmic_mesh_containment_unit',type:'qft',itemInputs:['kubejs:time_dilation_containment_unit','kubejs:leptonic_charge','2x kubejs:pellet_antimatter'],notConsumable:['gtceu:cosmicneutronium_nanoswarm'],itemOutputs:['15x kubejs:cosmic_mesh_containment_unit'],EUt:opv,duration:20
    },
    {
        id:'qft_actinium_superhydride_plasma_containment_cell',type:'qft',inputFluids:['gtceu:actinium_superhydride_plasma'],itemInputs:['16x gtceu:atinium_hydride_dust','kubejs:plasma_containment_cell','kubejs:naquadria_charge'],itemOutputs:['15x kubejs:actinium_superhydride_plasma_containment_cell'],duration:20,EUt:uiv
    },
    {
        id:'qft_rhenium_plasma_containment_cell',type:'qft',itemInputs:['kubejs:naquadria_charge','5x gtceu:double_rhenium_plate','kubejs:plasma_containment_cell'],itemOutputs:['15x kubejs:rhenium_plasma_containment_cell'],inputFluids:['gtceu:degenerate_rhenium_plasma'],EUt:uiv,duration:20
    },
    {
        id:'qft_crystalmatrix_plasma_containment_cell',type:'qft',itemInputs:['avaritia:crystal_matrix','kubejs:corporeal_matter','kubejs:leptonic_charge'],inputFluids:['gtceu:crystalmatrix_plasma'],itemOutputs:['15x kubejs:crystalmatrix_plasma_containment_cell'],EUt:uxv,duration:20
    },
    {
        id:'qft_draconiumawakened_plasma_containment_cell',type:'qft',itemInputs:['kubejs:quantum_chromodynamic_charge','kubejs:plasma_containment_cell','kubejs:unstable_star'],inputFluids:['gtceu:draconiumawakened_plasma', 'gtceu:draconium'],itemOutputs:['15x kubejs:draconiumawakened_plasma_containment_cell'],EUt:uxv,duration:20
    },
    {
        id:'qft_neutron_plasma_containment_cell',type:'qft',itemInputs:['kubejs:naquadria_charge','kubejs:plasma_containment_cell'],itemOutputs:['15x kubejs:neutron_plasma_containment_cell'],inputFluids:['gtceu:neutronium'],EUt:uiv,duration:20
    },
    {
        id:'qft_dense_neutron_plasma_cell',type:'qft',itemOutputs:['15x kubejs:dense_neutron_plasma_cell'],itemInputs:['kubejs:extremely_durable_plasma_cell','3x kubejs:quantum_chromodynamic_charge','3x gtceu:heavy_quark_degenerate_matter_block'],inputFluids:['gtceu:dense_neutron_plasma'],EUt:uxv,duration:20
    },
  //黑洞视界剥离扭   
    {
        id:'distort_black_hole_event_horizon_stripping',type:'distort',circuit:4,notConsumable:['256x gtceu:eye_of_harmony','dishanhai:time_reversal_protocol'],inputFluids:['gtceu:hydrogen 1310012','gtceu:helium 1310012','gtceu:raw_star_matter_plasma 131000'],itemInputs:['256x dishanhai:hxsp'],outputFluids:global.black_hole,blastFurnaceTemp:24000,EUt:2147483647*max,duration:1200,
    },   
    {
        id:'distort_black_hole_event_horizon_stripping_2',type:'distort',circuit:3,notConsumable:['256x gtceu:eye_of_harmony','dishanhai:time_reversal_protocol'],inputFluids:['gtceu:hydrogen 1310012','gtceu:helium 1310012','gtceu:raw_star_matter_plasma 131000'],itemInputs:['32x kubejs:quantum_chromodynamic_charge'],outputFluids:global.plasma_output_output,blastFurnaceTemp:24000,EUt:2147483647*max,duration:1200,
    },  
    {
        id:'distort_time_reversal_protocol_cosmos_plus',defaultEnabled:false,type:'distort',circuit:4,notConsumable:['64x gtceu:eye_of_harmony','dishanhai:time_reversal_protocol'],inputFluids:['gtceu:hydrogen 1310012','gtceu:helium 1310012','gtceu:grade_16_purified_water 131000'],itemOutputs:global.cosmos_simulation_output_items,blastFurnaceTemp:24000,duration:1200,EUt:65565*max
    },
    {
        id:'distort_cosmos_simulation_hxsp',type:'distort',circuit:2,notConsumable:['256x gtceu:eye_of_harmony','dishanhai:time_reversal_protocol'],itemInputs:['32x dishanhai:hxsp'],inputFluids:['gtceu:hydrogen 1310012','gtceu:helium 1310012','gtceu:raw_star_matter_plasma 131000'],itemOutputs:global.cosmos_simulation_output_items_hxsp,blastFurnaceTemp:24000,duration:1200,EUt:65565*max
    },
    {
        id:'distort_cosmos_simulation_pinnacle_eternity',type:'distort',circuit:1,notConsumable:['64x gtceu:eye_of_harmony','dishanhai:time_reversal_protocol'],inputFluids:['gtceu:hydrogen 1310012','gtceu:helium 1310012','gtceu:grade_16_purified_water 131000'],itemOutputs:global.cosmos_simulation_output_items_1,outputFluids:global.cosmos_fluid_output,blastFurnaceTemp:24000,duration:1200,EUt:65565*max
    },
    {
        id:'distort_biological_simulation_laboratory_Infinite',type:'distort',circuit:1,notConsumable:['64x gtladditions:biological_simulation_laboratory','dishanhai:gate_and_bridg','avaritia:infinity_sword'],itemOutputs:['10240x minecraft:nether_star','10240x minecraft:dragon_egg','20480x minecraft:wither_skeleton_skull','65565x minecraft:blaze_rod','65565x minecraft:cod','65565x minecraft:egg','65565x minecraft:beef','65565x minecraft:salmon','65565x minecraft:glowstone_dust','65565x minecraft:sugar','65565x minecraft:chicken','65565x minecraft:rotten_flesh','65565x minecraft:string','65565x minecraft:porkchop','65565x minecraft:slime_ball','65565x minecraft:gunpowder','65565x minecraft:ghast_tear','65565x minecraft:ender_pearl','65565x minecraft:mutton','65565x minecraft:white_wool','65565x minecraft:echo_shard','65565x minecraft:sculk_sensor','65565x minecraft:sculk_catalyst','65565x minecraft:sculk','65565x minecraft:bone','65565x minecraft:rabbit','65565x minecraft:tropical_fish','65565x minecraft:wheat','65565x minecraft:carrot','65565x minecraft:potato','65565x minecraft:poppy','65565x minecraft:feather','65565x minecraft:leather','65565x minecraft:rabbit_hide','65565x minecraft:spider_eye','65565x minecraft:rabbit_foot','65565x minecraft:ink_sac','65565x minecraft:glow_ink_sac','65565x minecraft:nautilus_shell','65565x minecraft:iron_ingot','65565x minecraft:gold_ingot','65565x minecraft:copper_ingot','65565x minecraft:gold_nugget','65565x minecraft:emerald','65565x minecraft:coal','65565x minecraft:redstone','65565x minecraft:bamboo','65565x minecraft:stick','65565x minecraft:arrow','65565x minecraft:glass_bottle'],blastFurnaceTemp:4000,EUt:uv,duration:200
    },
    {
        id:'distort_one_stop_platinum_treatment',type:'distort',circuit:1,notConsumable:['dishanhai:wzcz2'],itemInputs:['5000x gtceu:platinum_group_sludge_dust'],inputFluids:['gtceu:hydrogen 625000','gtceu:oxygen 1111000','gtceu:chlorine 125000','gtceu:fluorine 1000'],itemOutputs:['1500x gtceu:platinum_dust','1500x gtceu:palladium_dust','1500x gtceu:ruthenium_dust','1500x gtceu:iridium_dust','1500x gtceu:osmium_dust','1500x gtceu:rhodium_dust'],outputFluids:['gtceu:hydrogen 600000','gtceu:chlorine 125000','gtceu:fluorine 500'],blastFurnaceTemp:3000,duration:120,EUt:luv
    },
    {
        id:'distort_platinum_group_minerals_dust',type:'distort',circuit:2,notConsumable:['dishanhai:wzcz2','dishanhai:bridge_and_gate'],itemInputs:['8000x gtceu:platinum_group_sludge_dust'],inputFluids:['gtceu:hydrogen 625000','gtceu:oxygen 1111000','gtceu:chlorine 125000','gtceu:fluorine 1000'],itemOutputs:['10417x gtceu:platinum_dust','6944x gtceu:palladium_dust','3472x gtceu:rhodium_dust','3472x gtceu:iridium_dust','3472x gtceu:osmium_dust','3472x gtceu:ruthenium_dust','8681x gtceu:gold_dust','8681x gtceu:silver_dust','10417x gtceu:copper_dust','10417x gtceu:nickel_dust','5208x gtceu:cobalt_dust','3472x gtceu:sulfur_dust'],outputFluids:['gtceu:hydrogen 600000','gtceu:chlorine 125000','gtceu:fluorine 500'],blastFurnaceTemp:5000,duration:120,EUt:zpm
    },
    {
        id:'distort_platinum_group_minerals',type:'distort',circuit:3,defaultEnabled:true,notConsumable:['dishanhai:wzcz2','dishanhai:bridge_and_gate'],itemInputs:['8000x gtceu:platinum_group_sludge_dust'],inputFluids:['gtceu:hydrogen 625000','gtceu:oxygen 1111000','gtceu:chlorine 125000','gtceu:fluorine 1000'],itemOutputs:['10417x gtceu:platinum_ingot','6944x gtceu:palladium_ingot','3472x gtceu:rhodium_ingot','3472x gtceu:iridium_ingot','3472x gtceu:osmium_ingot','3472x gtceu:ruthenium_ingot','8681x minecraft:gold_ingot','8681x gtceu:silver_ingot','10417x minecraft:copper_ingot','10417x gtceu:nickel_ingot','5208x gtceu:cobalt_ingot','3472x gtceu:sulfur_dust'],outputFluids:['gtceu:hydrogen 600000','gtceu:chlorine 125000','gtceu:fluorine 500'],blastFurnaceTemp:9000,duration:200,EUt:uv
    },
    {
        id:'distort_platinum_group_minerals_csj',type:'distort',circuit:4,notConsumable:['576x dishanhai:wzcz2','dishanhai:csj',"dishanhai:platinum_god_proof"],itemInputs:['2147483647x gtceu:platinum_group_sludge_dust'],inputFluids:['gtceu:hydrogen 2147483647','gtceu:oxygen 2147483647','gtceu:chlorine 2147483647','gtceu:fluorine 2147483647'],itemOutputs:['2147483647x gtceu:platinum_ingot','2147483647x gtceu:palladium_ingot','2147483647x gtceu:rhodium_ingot','2147483647x gtceu:iridium_ingot','2147483647x gtceu:osmium_ingot','2147483647x gtceu:ruthenium_ingot','2147483647x minecraft:gold_ingot','2147483647x gtceu:silver_ingot','2147483647x minecraft:copper_ingot','2147483647x gtceu:nickel_ingot','2147483647x gtceu:cobalt_ingot','2147483647x gtceu:sulfur_dust'],outputFluids:['gtceu:hydrogen 2147483647','gtceu:chlorine 2147483647','gtceu:fluorine 2147483647'],blastFurnaceTemp:18900,duration:20,EUt:uxv
    },
    {
        id:'suprachronal_assembly_line_platinum_god_proof',type:'suprachronal_assembly_line',notConsumable:['dishanhai:dark_energy_multiplier','dishanhai:wzcz2'],itemInputs:['32x gtceu:assembler_module','32x gtceu:resource_collection',"32x gtceu:large_void_miner","32x gtceu:large_greenhouse","32x gtceu:large_incubator","64x gtceu:isa_mill"],itemOutputs:['dishanhai:platinum_god_proof'],inputFluids:['gtceu:platinum 1000000','gtceu:ruthenium 1000000','gtceu:rhodium 1000000'],EUt:uev,duration:200
    },
    {
        id:'suprachronal_assembly_line_cshx',type:'suprachronal_assembly_line',notConsumable:["dishanhai:annihilation_core","dishanhai:dark_energy_multiplier","dishanhai:time_reversal_protocol"],itemInputs:['2147483647x dishanhai:hxsp','83742x gtceu:neutronium_ingot','31956x gtceu:cosmicneutronium_ingot','79423x gtceu:cosmic_ingot','46821x gtceu:degenerate_rhenium_plate','2375x gtceu:cosmicneutronium_nanoswarm','582647x avaritia:neutron_ingot'],inputFluids:['gtceu:raw_star_matter_plasma 2147483647','gtceu:iron_plasma 2147483647','gtceu:helium_plasma 2147483647'],itemOutputs:['1x dishanhai:cshx'],stationResearch:{researchStack:'dishanhai:hxsp',dataStack:'gtceu:data_module',EUt:MAX,CWUt:8192},EUt:MAX,duration:400
    }

];

var dishanhaiSucc = 0;
var dishanhaifail = 0;

success = 0; fail = 0;

dishanhairecipes.forEach(function(recipe) {
    var validation = validateRecipe(recipe);
    if (!validation.valid) {
        console.error(`❌ 配方验证失败: ${recipe.id} (${recipe.type}) - ${validation.error}`);
        broadcastRecipeError(recipe.type, recipe.id, validation.error);
        fail++;
        return;
    }
    var ok = safeAddRecipe(recipe);
    ok ? success++ : fail++;
});

dishanhaiSucc = success;
dishanhaifail = fail;

var dishanhai_timer_end = DShanhaiRecipeEngine.endTimer(dishanhai_timer);

console.log(`🗓️ [山海的big私货] ♾️级物品配方添加完毕 成功:${dishanhaiSucc} | 失败:${dishanhaifail} | 耗时:${dishanhai_timer_end}ms`)

    //神鸿蒙(作弊配方,默认禁用)
    safeAddRecipe('cosmos_simulation', 'dishanhai:creator_God_home', () => {
    gtr.cosmos_simulation("dishanhai:creator_God_home")
    .itemInputs("thetornproductionline:celestial_secret_deducing_creative_module")
    .itemOutputs(
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:i",id:"kubejs:quantumchromodynamic_protective_plating"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:raw_star_matter_plasma"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:biomass"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:rocket_fuel"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:stellar_energy_rocket_fuel"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:i",id:"disksavior:quantum_chromodynamic_charge_super"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:milk"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:i",id:"kubejs:glacio_spirit"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:sterilized_growth_medium"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:biohmediumsterilized"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:raw_growth_medium"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:i",id:"kubejs:leptonic_charge"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:steam"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:uu_amplifier"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:i",id:"gtceu:fertilizer"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:i",id:"minecraft:dirt"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:i",id:"ae2:singularity"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:i",id:"ae2:matter_ball"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:i",id:"kubejs:scrap"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:ice"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:lubricant"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:fish_oil"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:i",id:"gtceu:meat_dust"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:salt_water"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:rocket_fuel_h8n4c2o4"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:distilled_water"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:cosmicneutronium"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:dense_neutron_plasma"}}'),
    Item.of('expatternprovider:infinity_cell', '{record:{"#c":"ae2:f",id:"gtceu:neutronium"}}'),
    '64x thetornproductionline:celestial_secret_deducing_creative_module',
    '64x kubejs:suprachronal_mainframe_complex',
    Item.of('ae2:portable_item_cell_16k', "{RepairCost:0,amts:[L;1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L],display:{Name:'{\"text\":\"通用电路板元件包\"}'},ic:15L,internalCurrentPower:20000.0d,keys:[{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:ulv_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:lv_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:mv_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:hv_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:ev_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:iv_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:luv_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:zpm_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:uv_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:uhv_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:uev_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:uiv_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:uxv_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:opv_universal_circuit\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"kubejs:max_universal_circuit\"}}}]}"),
    Item.of('ae2:portable_item_cell_256k', '{amts:[L;1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L],ic:13L,internalCurrentPower:20000.0d,keys:[{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:i",id:"kubejs:hypercube"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:f",id:"gtceu:chaos"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:f",id:"gtceu:magmatter"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:i",id:"gtladditions:astral_array"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:f",id:"gtceu:eternity"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:i",id:"disksavior:quantum_chromodynamic_charge_super"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:f",id:"gtceu:white_dwarf_mtter"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:i",id:"gtladditions:black_hole_seed"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:f",id:"gtceu:magnetohydrodynamicallyconstrainedstarmatter"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:i",id:"avaritia:infinity_ingot"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:i",id:"kubejs:infinity_antimatter_fuel_rod"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:i",id:"kubejs:annihilation_constrainer"}}},{"#c":"ae2:i",id:"expatternprovider:infinity_cell",tag:{record:{"#c":"ae2:f",id:"gtceu:black_dwarf_mtter"}}}]}'),
    Item.of('ae2:portable_item_cell_16k', "{RepairCost:0,amts:[L;64L,64L,64L,64L,64L,64L,64L,128L,64L,64L,64L,64L,64L,64L,64L],display:{Name:'{\"text\":\"模块元件包\"}'},ic:1024L,internalCurrentPower:20000.0d,keys:[{\"#c\":\"ae2:i\",id:\"thetornproductionline:hyper_excitation_module_3\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:fishbig_process_module_p3\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:fishbig_process_module_p6\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:fishbig_process_module_p1\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:fishbig_process_module_p8\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:fishbig_process_module\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:fishbig_process_module_p4\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:fishbig_process_module_base\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:fishbig_process_module_p2\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:fission_reactor_module\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:neutron_activator_module\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:fusion_process_module\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:circult_process_module_4\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:fishbig_process_module_p7\"},{\"#c\":\"ae2:i\",id:\"thetornproductionline:black_hole_engine_module\"}]}"),
    Item.of('ae2:portable_item_cell_16k', "{RepairCost:0,amts:[L;1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L],display:{Name:'{\"text\":\"木化石化元件包\"}'},ic:23L,internalCurrentPower:20000.0d,keys:[{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:ethanol\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:naphthalene\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:octane\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:ethane\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:propane\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:butane\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:toluene\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:benzene\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:butadiene\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:butene\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:propene\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:ethylene\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:methanol\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:absolute_ethanol\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:methane\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:methyl_acetate\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:acetic_acid\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:carbon\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:creosote\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:carbon_monoxide\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:dimethylbenzene\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:acetone\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:phenol\"}}}]}"),
    Item.of('ae2:portable_item_cell_16k', "{RepairCost:0,amts:[L;1L,1L,1L],display:{Name:'{\"text\":\"宇宙探测元件包\"}'},ic:3L,internalCurrentPower:20000.0d,keys:[{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:cosmic_element\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:starlight\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:heavy_lepton_mixture\"}}}]}"),
    Item.of('ae2:portable_item_cell_16k', "{RepairCost:0,amts:[L;1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L],display:{Name:'{\"text\":\"鸿蒙元件包\"}'},ic:144L,internalCurrentPower:20000.0d,keys:[{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:carbon_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:phosphorus_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:sulfur_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:selenium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:iodine_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:boron_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:silicon_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:germanium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:arsenic_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:antimony_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tellurium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:astatine_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:aluminium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:gallium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:indium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tin_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:thallium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:lead_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:bismuth_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:polonium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:titanium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:vanadium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:chromium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:manganese_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:iron_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:cobalt_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:nickel_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:copper_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:zinc_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:zirconium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:niobium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:molybdenum_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:technetium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:ruthenium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:rhodium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:palladium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:silver_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:cadmium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:hafnium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tantalum_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tungsten_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:rhenium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:osmium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:iridium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:platinum_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:gold_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:beryllium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:magnesium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:calcium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:strontium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:barium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:radium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:yttrium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:lithium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:sodium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:potassium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:rubidium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:caesium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:francium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:scandium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:actinium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:thorium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:protactinium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:uranium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:neptunium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:plutonium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:americium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:curium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:berkelium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:californium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:einsteinium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:fermium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:mendelevium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:nobelium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:lawrencium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:lanthanum_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:cerium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:praseodymium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:neodymium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:promethium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:samarium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:europium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:gadolinium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:terbium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:dysprosium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:holmium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:erbium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:thulium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:ytterbium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:lutetium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:rutherfordium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:dubnium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:seaborgium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:bohrium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:hassium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:meitnerium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:darmstadtium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:roentgenium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:copernicium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:nihonium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:flerovium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:moscovium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:livermorium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tennessine_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:oganesson_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:jasper_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:naquadah_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:enriched_naquadah_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:naquadria_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:duranium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tritanium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:mithril_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:orichalcum_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:enderium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:adamantine_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:vibranium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:infuscolium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:taranium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:draconium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:starmetal_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:spacetime\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:raw_star_matter_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:quark_gluon_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:heavy_quark_degenerate_matter_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:neutronium\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:heavy_lepton_mixture\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:hydrogen\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:nitrogen\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:oxygen\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:fluorine\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:chlorine\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:bromine\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:helium\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:neon\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:argon\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:krypton\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:xenon\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:radon\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:mercury\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:deuterium\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:tritium\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:helium_3\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:unknowwater\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:uu_matter\"}}}]}"),
    Item.of('ae2:portable_item_cell_16k', "{RepairCost:0,amts:[L;1L,1L,1L,1L,1L,1L],display:{Name:'{\"text\":\"集气元件包\"}'},ic:6L,internalCurrentPower:20000.0d,keys:[{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:air\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:liquid_air\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:nether_air\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:liquid_nether_air\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:ender_air\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:liquid_ender_air\"}}}]}"),
    Item.of('ae2:portable_item_cell_16k', "{RepairCost:0,amts:[L;5L,10L,5L,128L,64L,64L,1L,1L,1L,5L,64L,64L,5L,5L,5L,1L,128L,1L,1145L,1L,64L,1L,1L,1L,64L,1024L,1L,128L,5L,1L,64L,10L,128L,1L,14L,64L,128L,64L,1L,64L,128L,128L,1L,9L,512L,64L,64L,1L,256L,64L,10L,5L,5L,256L,128L,64L],display:{Name:'{\"text\":\"创造物品元件包\"}'},ic:5226L,internalCurrentPower:20000.0d,keys:[{\"#c\":\"ae2:i\",id:\"avaritia:endless_cake\"},{\"#c\":\"ae2:i\",id:\"mekanism:creative_chemical_tank\"},{\"#c\":\"ae2:i\",id:\"sgjourney:universe_stargate\"},{\"#c\":\"ae2:i\",id:\"gtceu:creative_energy\"},{\"#c\":\"ae2:i\",id:\"gtceu:research_station\"},{\"#c\":\"ae2:i\",id:\"gtceu:ancient_gold_coin\"},{\"#c\":\"ae2:i\",id:\"sgjourney:pegasus_dhd\",tag:{BlockEntityTag:{Energy:0L,Inventory:{Items:[{Count:1b,Slot:0,id:\"sgjourney:large_control_crystal\"},{Count:1b,Slot:1,id:\"sgjourney:advanced_energy_crystal\",tag:{Energy:0}},{Count:1b,Slot:2,id:\"sgjourney:advanced_communication_crystal\",tag:{Frequency:0}},{Count:1b,Slot:3,id:\"sgjourney:advanced_energy_crystal\",tag:{Energy:0}},{Count:1b,Slot:6,id:\"sgjourney:advanced_communication_crystal\",tag:{Frequency:0}},{Count:1b,Slot:7,id:\"sgjourney:advanced_transfer_crystal\",tag:{TransferLimit:5000L}}],Size:9},energy_inventory:{Items:[{Count:1b,Slot:0,id:\"sgjourney:fusion_core\"}],Size:2},id:\"sgjourney:pegasus_dhd\"}}},{\"#c\":\"ae2:i\",id:\"avaritia:infinity_sword\"},{\"#c\":\"ae2:i\",id:\"avaritia:infinity_axe\"},{\"#c\":\"ae2:i\",id:\"avaritia:infinity_umbrella\"},{\"#c\":\"ae2:i\",id:\"gtlcore:super_glue\"},{\"#c\":\"ae2:i\",id:\"gtceu:creative_data_access_hatch\"},{\"#c\":\"ae2:i\",id:\"appmek:creative_chemical_cell\"},{\"#c\":\"ae2:i\",id:\"mekanism:creative_bin\"},{\"#c\":\"ae2:i\",id:\"ae2:creative_item_cell\"},{\"#c\":\"ae2:i\",id:\"avaritia:infinity_totem\",tag:{Damage:0}},{\"#c\":\"ae2:i\",id:\"gtmthings:creative_laser_hatch\"},{\"#c\":\"ae2:i\",id:\"ae2:fluix_axe\",tag:{Damage:0}},{\"#c\":\"ae2:i\",id:\"kubejs:giga_chad\"},{\"#c\":\"ae2:i\",id:\"avaritia:infinity_pickaxe\",tag:{}},{\"#c\":\"ae2:i\",id:\"kubejs:create_ultimate_battery\"},{\"#c\":\"ae2:i\",id:\"avaritia:infinity_bucket\"},{\"#c\":\"ae2:i\",id:\"avaritia:infinity_helmet\"},{\"#c\":\"ae2:i\",id:\"avaritia:infinity_pants\"},{\"#c\":\"ae2:i\",id:\"gtceu:neutronium_credit\"},{\"#c\":\"ae2:i\",id:\"avaritia:ultimate_stew\"},{\"#c\":\"ae2:i\",id:\"projecte:tome\"},{\"#c\":\"ae2:i\",id:\"gtceu:creative_chest\"},{\"#c\":\"ae2:i\",id:\"ae2:creative_fluid_cell\"},{\"#c\":\"ae2:i\",id:\"sgjourney:pegasus_stargate\"},{\"#c\":\"ae2:i\",id:\"gtceu:door_of_create\"},{\"#c\":\"ae2:i\",id:\"mekanism:creative_fluid_tank\"},{\"#c\":\"ae2:i\",id:\"gtmthings:creative_item_input_bus\"},{\"#c\":\"ae2:i\",id:\"avaritia:infinity_chestplate\"},{\"#c\":\"ae2:i\",id:\"sgjourney:classic_stargate_ring_block\"},{\"#c\":\"ae2:i\",id:\"gtceu:doge_coin\"},{\"#c\":\"ae2:i\",id:\"gtmthings:creative_energy_hatch\"},{\"#c\":\"ae2:i\",id:\"gtladditions:arcanic_astrograph\"},{\"#c\":\"ae2:i\",id:\"sgjourney:classic_stargate_base_block\"},{\"#c\":\"ae2:i\",id:\"gtladditions:heart_of_the_universe\"},{\"#c\":\"ae2:i\",id:\"gtmthings:creative_fluid_input_hatch\"},{\"#c\":\"ae2:i\",id:\"gtceu:creative_tank\"},{\"#c\":\"ae2:i\",id:\"avaritia:infinity_boots\"},{\"#c\":\"ae2:i\",id:\"sgjourney:classic_stargate_chevron_block\"},{\"#c\":\"ae2:i\",id:\"kubejs:heartofthesmogus\"},{\"#c\":\"ae2:i\",id:\"minecraft:command_block\"},{\"#c\":\"ae2:i\",id:\"gtceu:eye_of_harmony\"},{\"#c\":\"ae2:i\",id:\"gtceu:lava_furnace\"},{\"#c\":\"ae2:i\",id:\"expatternprovider:fishbig\"},{\"#c\":\"ae2:i\",id:\"gtceu:chocolate_coin\"},{\"#c\":\"ae2:i\",id:\"mekanism:creative_energy_cube\",tag:{mekData:{EnergyContainers:[{Container:0b,stored:\"18446744073709551615.9999\"}],componentConfig:{config0:{side0:4,side1:4,side2:4,side3:4,side4:4,side5:4}}}}},{\"#c\":\"ae2:i\",caps:{Parent:{Items:[],Size:81}},id:\"avaritia:neutron_ring\"},{\"#c\":\"ae2:i\",id:\"avaritia:infinity_ring\"},{\"#c\":\"ae2:i\",id:\"gtlcore:ultimate_tea\"},{\"#c\":\"ae2:i\",id:\"gtceu:creative_computation_provider\"},{\"#c\":\"ae2:i\",id:\"gtceu:create_aggregation\"}],sort_by:\"MOD\",sort_direction:\"ASCENDING\",view_mode:\"ALL\"}"),
    Item.of('ae2:portable_item_cell_16k', "{RepairCost:0,amts:[L;1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L,1L],display:{Name:'{\"text\":\"黑洞元件包\"}'},ic:179L,internalCurrentPower:20000.0d,keys:[{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:carbon_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:phosphorus_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:sulfur_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:selenium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:iodine_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:boron_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:silicon_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:germanium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:arsenic_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:antimony_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tellurium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:astatine_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:aluminium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:gallium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:indium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tin_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:thallium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:lead_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:bismuth_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:polonium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:titanium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:vanadium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:chromium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:manganese_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:iron_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:cobalt_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:nickel_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:copper_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:zinc_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:zirconium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:niobium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:molybdenum_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:technetium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:ruthenium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:rhodium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:palladium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:silver_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:cadmium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:hafnium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tantalum_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tungsten_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:rhenium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:osmium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:iridium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:platinum_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:gold_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:beryllium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:magnesium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:calcium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:strontium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:barium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:radium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:yttrium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:lithium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:sodium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:potassium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:rubidium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:caesium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:francium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:scandium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:actinium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:thorium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:protactinium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:uranium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:neptunium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:plutonium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:americium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:curium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:berkelium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:californium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:einsteinium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:fermium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:mendelevium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:nobelium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:lawrencium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:lanthanum_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:cerium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:praseodymium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:neodymium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:promethium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:samarium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:europium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:gadolinium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:terbium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:dysprosium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:holmium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:erbium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:thulium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:ytterbium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:lutetium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:rutherfordium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:dubnium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:seaborgium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:bohrium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:hassium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:meitnerium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:darmstadtium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:roentgenium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:copernicium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:nihonium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:flerovium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:moscovium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:livermorium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tennessine_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:oganesson_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:jasper_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:naquadah_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:enriched_naquadah_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:naquadria_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:duranium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:tritanium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:mithril_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:orichalcum_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:enderium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:adamantine_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:vibranium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:infuscolium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:taranium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:draconium_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:i\",id:\"gtceu:starmetal_dust\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:spacetime\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:raw_star_matter_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:quark_gluon_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:heavy_quark_degenerate_matter_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:neutronium\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:heavy_lepton_mixture\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:hydrogen\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:nitrogen\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:oxygen\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:fluorine\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:chlorine\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:bromine\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:helium\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:neon\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:argon\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:krypton\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:xenon\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:radon\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:mercury\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:deuterium\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:tritium\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:helium_3\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:unknowwater\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:uu_matter\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:taranium_rich_liquid_helium_4_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:quark_gluon_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:dense_neutron_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:high_energy_quark_gluon_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:eternity\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:cosmic_mesh_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:actinium_superhydride_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:dimensionallytranscendentcrudecatalyst\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:vibranium_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:adamantium_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:silver_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:oxygen_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:nitrogen_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:iron_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:helium_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:argon_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:nickel_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:infuscolium_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:orichalcum_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:starmetal_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:draconiumawakened_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:legendarium_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:echoite_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:crystalmatrix_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:mithril_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:chaos_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:flyb_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:quasifissioning_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:celestialtungsten_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:astraltitanium_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:quantumchromodynamically_confined_matter_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:metastable_hassium_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:degenerate_rhenium_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:heavy_quark_degenerate_matter_plasma\"}}},{\"#c\":\"ae2:i\",id:\"expatternprovider:infinity_cell\",tag:{record:{\"#c\":\"ae2:f\",id:\"gtceu:enderium_plasma\"}}}]}")
)
    .duration(1200)
    .inputFluids("minecraft:water 102400")
    },{defaultEnabled:false})

    // ========== 创造模块 ==========
    safeAddRecipe('suprachronal_assembly_line', 'dishanhai:czmk', () => {
        gtr.suprachronal_assembly_line('dishanhai:czmk')
            .itemInputs('dishanhai:halo_end','256x dishanhai:god_forge_mod','512x dishanhai:wzcz3','256x gtladditions:forge_of_the_antichrist','256x gtceu:suprachronal_assembly_line','256x gtladditions:arcanic_astrograph','21474836x gtladditions:astral_array','2048x gtladditions:astral_convergence_nexus','2048x gtladditions:nebula_reaper',"5200x dishanhai:dark_energy_multiplier","dishanhai:collapse_tear","dishanhai:bridge_and_gate","dishanhai:gate_and_bridg","dishanhai:csj","dishanhai:big_tear")
            .inputFluids('gtladditions:star_gate_crystal_slurry 21474836','gtceu:magnetohydrodynamicallyconstrainedstarmatter 2147483647','gtceu:spatialfluid 2147483647')
            .itemOutputs('dishanhai:create_mk')
            .EUt(MAX)
            .duration(20)
            .stationResearch(b => b.researchStack(Registries.getItemStack("dishanhai:wzcz3")).dataStack(Registries.getItemStack("gtceu:data_module")).EUt(MAX).CWUt(8192));
    });
    

    
    var $ModuleLCond; try { $ModuleLCond = Java.loadClass('com.dishanhai.gt_shanhai.api.ModuleLevelCondition'); } catch(e) {}
    safeAddRecipe('matter_module_casting', 'dishanhai:wzqs_source', () => {
        gtr.matter_module_casting('dishanhai:wzqs_source')
            .itemInputs('64x dishanhai:wzcz2','64x gtceu:uev_machine_hull',
                '64x gtceu:uev_emitter','64x gtceu:uev_field_generator',
                '64x gtceu:uev_processor_mainframe','64x gtceu:uev_sensor',
                '32x gtceu:quantum_star','32x gtladditions:heliothermal_plasma_fabricator',
                '32x gtladditions:heliophase_leyline_crystallizer',
                '32x gtladditions:apocalyptic_torsion_quantum_matrix',
                '16x gtceu:annihilate_generator','16x gtladditions:arcanic_astrograph',
                '16x dishanhai:dark_energy_multiplier')
            .inputFluids('gtceu:spacetime 1000000','gtceu:magmatter 1000000',
                'gtceu:infinity 1000000','dishanhai:matter_fluid_advanced 500000')
            .itemOutputs('dishanhai:wzqs')
            .outputFluids('dishanhai:matter_fluid_transition 500000')
            .addCondition($ModuleLCond !== undefined && $ModuleLCond !== null ? new $ModuleLCond("dishanhai:wzjc", 3) : null)
            .EUt(UEV)
            .duration(200);
            
    });

    safeAddRecipe('suprachronal_assembly_line', 'dishanhai:wzcz3', () => {
        gtr.suprachronal_assembly_line('dishanhai:wzcz3')
            .itemInputs('16x gtladditions:forge_of_the_antichrist','64x gtladditions:heliothermal_plasma_fabricator','64x gtladditions:helioflare_power_forge','64x gtladditions:heliofluix_melting_core','64x gtladditions:heliofusion_exoticizer','64x gtladditions:heliophase_leyline_crystallizer','64x gtladditions:space_infinity_integrated_ore_processor','64x gtceu:create_aggregation','64x gtceu:space_elevator','64x gtladditions:arcanic_astrograph','64x gtladditions:apocalyptic_torsion_quantum_matrix','64x gtceu:suprachronal_assembly_line','64x gtladditions:dimensionally_transcendent_chemical_plant','64x gtceu:molecular_assembler_matrix','64x gtceu:atomic_energy_excitation_plant','64x gtceu:annihilate_generator')
            .inputFluids('gtceu:infinity 2140000','gtceu:spacetime 2140000','gtceu:spatialfluid 2140000','gtceu:magmatter 2140000')
            .itemOutputs('dishanhai:wzcz3')
            .EUt(MAX)
            .duration(20);
    });
    
    // ========== 电路配方组 ==========
    const circuitRecipes = [
        { id: 'uv_to_universal', input: '#gtceu:circuits/uv', output: 'kubejs:uv_universal_circuit' },
        { id: 'uhv_to_universal', input: '#gtceu:circuits/uhv', output: 'kubejs:uhv_universal_circuit' },
        { id: 'uev_to_universal', input: '#gtceu:circuits/uev', output: 'kubejs:uev_universal_circuit' },
        { id: 'uiv_to_universal', input: '#gtceu:circuits/uiv', output: 'kubejs:uiv_universal_circuit' },
        { id: 'uxv_to_universal', input: '#gtceu:circuits/uxv', output: 'kubejs:uxv_universal_circuit' },
        { id: 'opv_to_universal', input: '#gtceu:circuits/opv', output: 'kubejs:opv_universal_circuit' },
        { id: 'max_to_universal', input: '#gtceu:circuits/max', output: 'kubejs:max_universal_circuit' }
    ];
    
    circuitRecipes.forEach(recipe => {
        safeAddRecipe('circuit_assembler', `dishanhai:${recipe.id}`, () => {
            gtr.circuit_assembler(`dishanhai:${recipe.id}`)
                .notConsumable('dishanhai:wzcz2')
                .itemInputs(recipe.input)
                .inputFluids('minecraft:water 72')
                .itemOutputs(recipe.output)
                .EUt(20)
                .duration(20);
        });
    });
    
    // ========== 电路增产配方 ==========
    const conversionRecipes = [
        { id: 'zpm', input: '#gtceu:circuits/uv', output: '16x kubejs:zpm_universal_circuit', circuit: 1, EUt: 92 },
        { id: 'max_to_opv', input: '#gtceu:circuits/max', output: '96x kubejs:opv_universal_circuit', circuit: 2 },
        { id: 'opv_to_uxv', input: '#gtceu:circuits/opv', output: '80x kubejs:uxv_universal_circuit', circuit: 3 },
        { id: 'uxv_to_uiv', input: '#gtceu:circuits/uxv', output: '64x kubejs:uiv_universal_circuit', circuit: 4 },
        { id: 'uiv_to_uev', input: '#gtceu:circuits/uiv', output: '48x kubejs:uev_universal_circuit', circuit: 5 },
        { id: 'uev_to_uhv', input: '#gtceu:circuits/uev', output: '32x kubejs:uhv_universal_circuit', circuit: 6 },
        { id: 'uhv_to_uv', input: '#gtceu:circuits/uhv', output: '16x kubejs:uv_universal_circuit', circuit: 7 }
    ];
    
    conversionRecipes.forEach(recipe => {
        safeAddRecipe('assembler', `dishanhai:${recipe.id}`, () => {
            let ass = gtr.assembler(`dishanhai:${recipe.id}`)
                .circuit(recipe.circuit)
                .notConsumable('dishanhai:wzcz2')
                .itemInputs(recipe.input)
                .itemOutputs(recipe.output)
                .duration(20);
            if (recipe.EUt) {
                ass.EUt(recipe.EUt);
            } else {
                ass.EUt(20);
            }
        });
    });
    
    // ========== 终极模块 ==========
    safeAddRecipe('assembly_line', 'dishanhai:czmk2', () => {
        gtr.assembly_line('dishanhai:czmk2')
            .notConsumable('dishanhai:wzcz3')
            .itemInputs('kubejs:chaotic_core','1x kubejs:iv_universal_circuit','1x kubejs:luv_universal_circuit','1x kubejs:zpm_universal_circuit','1x kubejs:uv_universal_circuit','1x kubejs:uhv_universal_circuit','1x kubejs:uev_universal_circuit','1x kubejs:uiv_universal_circuit','1x kubejs:uxv_universal_circuit','1x kubejs:opv_universal_circuit','1x kubejs:max_universal_circuit','kubejs:eternity_catalyst','16x kubejs:nuclear_star','16x gtceu:eternity_foil','4x gtceu:eternity_plate')
            .inputFluids('gtceu:infinity 1000','gtceu:spacetime 1000','gtceu:eternity 1000','gtceu:magnetohydrodynamicallyconstrainedstarmatter 1000')
            .itemOutputs('kubejs:suprachronal_mainframe_complex')
            .EUt(2 * MAX)
            .duration(20)
            .stationResearch(b => b.researchStack(Registries.getItemStack("kubejs:suprachronal_max")).dataStack(Registries.getItemStack("gtceu:data_module")).EUt(MAX).CWUt(8192));
    });
    
    // ========== 星门四件套 ==========
    const avaritiaRecipes = [
        { id: 'cswhzs', output: 'avaritia:infinity_umbrella', casing: 'god_forge_trim_casing' },
        { id: 'qydxzj', output: 'avaritia:infinity_ring', casing: 'god_forge_energy_casing' },
        { id: 'nxmzj', output: 'avaritia:neutron_ring', casing: 'god_forge_support_casing' },
        { id: 'yzxm', output: 'sgjourney:universe_stargate', casing: 'god_forge_inner_casing' }
    ];
    
    avaritiaRecipes.forEach(recipe => {
        safeAddRecipe('suprachronal_assembly_line', `dishanhai:${recipe.id}`, () => {
            gtr.suprachronal_assembly_line(`dishanhai:${recipe.id}`)
                .notConsumable('dishanhai:wzcz3')
                .itemInputs('gtladditions:forge_of_the_antichrist','gtladditions:helioflare_power_forge','gtladditions:heliofusion_exoticizer','gtladditions:heliofluix_melting_core','gtladditions:heliothermal_plasma_fabricator','gtladditions:heliophase_leyline_crystallizer','1024x kubejs:suprachronal_mainframe_complex',`64x gtladditions:${recipe.casing}`)
                .inputFluids('gtceu:primordialmatter 1000000','gtladditions:star_gate_crystal_slurry 100000','gtceu:spatialfluid 1000000')
                .itemOutputs(recipe.output)
                .EUt(2147483647 * MAX)
                .duration(20);
        });
    });
    
    safeAddRecipe('suprachronal_assembly_line', 'dishanhai:tianqiu', () => {
        gtr.suprachronal_assembly_line('dishanhai:tianqiu')
            .notConsumable('dishanhai:wzcz3')
            .itemInputs('10240x dishanhai:cshx','32x gtladditions:astral_array')
            .itemOutputs('gtladditions:thread_modifier_hatch')
            .EUt(MAX)
            .duration(20);
 
    });


    
var createMkRecipes = [
    { 
        id: 'fluix_axe',type: 'assembler',itemInputs: ['minecraft:diamond_axe'], inputFluids: [],itemOutputs: ['ae2:fluix_axe'] , outputFluids: [],circuit: null,
    },
     {   id: 'chest',
        type: 'assembler',
        notConsumable: 'dishanhai:create_mk',
        itemInputs: ['dishanhai:cshx'],
        itemOutputs: ['gtceu:creative_chest'],
        EUt: max,
        duration: 20
    },
    {
        id: 'tank',
        type: 'assembler',
        circuit: 2,
        notConsumable: 'dishanhai:create_mk',
        itemInputs: ['dishanhai:cshx'],
        itemOutputs: ['gtceu:creative_tank'],
        EUt: max,
        duration: 20
    },
    {
        id: 'mekzq',
        type: 'assembler',
        notConsumable: 'dishanhai:create_mk',
        itemInputs: ['gtladditions:forge_of_the_antichrist'],
        itemOutputs: ['ae2:controller'],
        EUt: 20,
        duration: 20
    },
];
// 创造模块 - 修复版
console.log(`[山海的big私货] 🔓创始现实修改模块配方开始添加`)
let create_mk_Success = 0
let create_mk_Failed = 0
var timercre = DShanhaiRecipeEngine.startTimer('创始现实修改模块')

createMkRecipes.forEach(recipe => {
    if (!gtr[recipe.type]) {
        console.error(`❌ 未知机器类型: ${recipe.type}`);
        create_mk_Failed++;
        return;
    }
    try {
        safeAddRecipe('assembler', `dishanhai:${recipe.id}`, () => {
            let machine = gtr[recipe.type](`dishanhai:${recipe.id}`);
            machine.notConsumable('dishanhai:create_mk')
            if (recipe.circuit !== null && recipe.circuit !== undefined) machine.circuit(recipe.circuit);
            if (recipe.itemInputs && recipe.itemInputs.length > 0) machine.itemInputs.apply(machine, recipe.itemInputs);
            if (recipe.inputFluids && recipe.inputFluids.length > 0) machine.inputFluids.apply(machine, recipe.inputFluids);
            if (recipe.itemOutputs && recipe.itemOutputs.length > 0) machine.itemOutputs.apply(machine, recipe.itemOutputs);
            if (recipe.outputFluids && recipe.outputFluids.length > 0) machine.outputFluids.apply(machine, recipe.outputFluids);
            if (recipe.blastFurnaceTemp) machine.blastFurnaceTemp(recipe.blastFurnaceTemp);
            machine.EUt(max).duration(20);
        });
        create_mk_Success++;
    } catch(err) {
        create_mk_Failed++;
    }
});

var timerce = DShanhaiRecipeEngine.endTimer(timercre)


    
    // ========== 超密度爆弹配方 ========== 导师求你不要再导了😭
    safeAddRecipe('electric_implosion_compressor', 'dishanhai:baodan', () => {
        gtr.electric_implosion_compressor('dishanhai:baodan')
            .itemInputs('16384x kubejs:quantum_chromodynamic_charge')
            .itemOutputs('1x disksavior:quantum_chromodynamic_charge_super')
            .EUt(MAX)
            .duration(20);
    });
    
    // ========== 熔岩炉配方 ========== 需删除原配方 待定 用java侧配方层修改删除
    safeAddRecipe('lava_furnace', 'dishanhai:lava', () => {
        gtr.lava_furnace('dishanhai:lava')
            .itemInputs('1x #forge:stone')
            .outputFluids('minecraft:lava 10000')
            .EUt(LV)
            .duration(20);
    });
    
    safeAddRecipe('lava_furnace', 'dishanhai:lava2', () => {
        gtr.lava_furnace('dishanhai:lava2')
            .itemInputs('#forge:cobblestone')
            .outputFluids('minecraft:lava 10000')
            .EUt(LV)
            .duration(20);
    });
    
    
    // ========== 蒲公英温室 ==========
    safeAddRecipe('greenhouse', 'dishanhai:pgy', () => {
        gtr.greenhouse('dishanhai:pgy')
            .notConsumable('minecraft:dandelion')
            .inputFluids('minecraft:water 1000')
            .itemOutputs('32x minecraft:dandelion')
            .EUt(LV)
            .duration(20);
    });
    
    // ========== 宇宙探测器配方组 ==========
    const probeRecipes = [
        { id: 'mk1_celestial_secret', circuit: 1, output: 'gtceu:celestial_secret 1048576', EUt: 21474836 },
        { id: 'mk1_spacetime', circuit: 2, output: 'gtceu:spacetime 1048576', EUt: OpV },
        { id: 'mk1_cosmic_element', circuit: 3, output: 'gtceu:cosmic_element 1048576', EUt: OpV },
        { id: 'mk1_raw_star_matter_plasma', circuit: 4, output: 'gtceu:raw_star_matter_plasma 1048576', EUt: OpV },
        { id: 'gradox', circuit: 5, output: 'gtceu:radox 100000', EUt: MAX }
    ];
    
    probeRecipes.forEach(recipe => {
        safeAddRecipe('space_cosmic_probe_receivers', `dishanhai:${recipe.id}`, () => {
            gtr.space_cosmic_probe_receivers(`dishanhai:${recipe.id}`)
                .circuit(recipe.circuit)
                .notConsumable('dishanhai:cosmic_probe_mk')
                .outputFluids(recipe.output)
                .EUt(recipe.EUt)
                .duration(20);
        });
    });
    
    // ========== 赛特斯修复配方 ==========
    safeAddRecipe('macerator', 'dishanhai:stsf', () => {
        gtr.macerator('dishanhai:stsf')
            .itemInputs('ae2:certus_quartz_crystal')
            .itemOutputs('gtceu:certus_quartz_dust')
            .duration(20)
            .EUt(lv);
    });
    
    // ========== 合金冶炼配方 ==========批处理待添加名单
    safeAddRecipe('alloy_blast_smelter', 'dishanhai:gang', () => {
        gtr.alloy_blast_smelter('dishanhai:gang')
            .circuit(15)
            .itemInputs('1x minecraft:iron_ingot','1x gtceu:coal_dust')
            .outputFluids('gtceu:steel 444')
            .duration(20)
            .EUt(mv)
            .blastFurnaceTemp(1500);
    });
    
    safeAddRecipe('alloy_blast_smelter', 'dishanhai:wrought_iron', () => {
        gtr.alloy_blast_smelter('dishanhai:wrought_iron')
            .circuit(20)
            .itemInputs('minecraft:iron_ingot','gtceu:carbon_dust')
            .outputFluids('gtceu:wrought_iron 444')
            .EUt(mv)
            .duration(20)
            .blastFurnaceTemp(1500);
    });
    

// 混沌炼金
safeAddRecipe('chaotic_alchemy', 'indium_gallium_phosphide', () => {
    gtr.chaotic_alchemy('dishanhai:indium_gallium_phosphide')
        .itemInputs('gtceu:indium_dust','gtceu:gallium_dust','gtceu:phosphorus_dust')
        .outputFluids('gtceu:indium_gallium_phosphide 444')
        .EUt(uiv)
        .duration(20)
        .blastFurnaceTemp(9000);
});

    
    // ========== 龙脉结晶配方 ==========批处理待添加名单
    safeAddRecipe('leyline_crystallize', 'dishanhai:draconium_block_charged', () => {
        gtr.leyline_crystallize('dishanhai:draconium_block_charged')
            .notConsumable('kubejs:dragon_stabilizer_core')
            .itemInputs('64x kubejs:infused_obsidian','16x kubejs:draconium_dust')
            .itemOutputs('128x kubejs:draconium_block_charged')
            .EUt(opv)
            .duration(20);
    });

  //电解机配方批处理  神秘电解男 硬编码批处理简化待定

var timer_electrolyzer = DShanhaiRecipeEngine.startTimer('电解机')
const recipes_electrolyzers = [
            {id:'air_sour',type:'electrolyzer',circuit:1,notConsumable:'dishanhai:wzcz1',inputFluids:['gtceu:air 8000'],outputFluids:['gtceu:hydrochloric_acid 1000','gtceu:sulfuric_acid 1000','gtceu:hydrofluoric_acid 1000','gtceu:formic_acid 1000','gtceu:acetic_acid 1000','gtceu:oxalic_acid 1000','gtceu:fluoroboric_acide 1000'],EUt:mv,duration:20}
]

let electrolyzerSuccess = 0
let electrolyzerFailed = 0

recipes_electrolyzers.forEach(recipe => {
    let result = safeAddRecipe(`${recipe.type}`, `dishanhai:${recipe.id}`, () => {
        let machine = gtr[recipe.type](`dishanhai:${recipe.id}`)
        if (recipe.notConsumable) machine.notConsumable(recipe.notConsumable)
        if (recipe.circuit !== null && recipe.circuit !== undefined) machine.circuit(recipe.circuit)
        if (recipe.itemInputs && recipe.itemInputs.length > 0) machine.itemInputs.apply(machine, recipe.itemInputs)
        if (recipe.inputFluids && recipe.inputFluids.length > 0) machine.inputFluids.apply(machine, recipe.inputFluids)
        if (recipe.itemOutputs && recipe.itemOutputs.length > 0) machine.itemOutputs.apply(machine, recipe.itemOutputs)
        if (recipe.outputFluids && recipe.outputFluids.length > 0) machine.outputFluids.apply(machine, recipe.outputFluids)
        if (recipe.blastFurnaceTemp) machine.blastFurnaceTemp(recipe.blastFurnaceTemp)
        machine.EUt(recipe.EUt)
        machine.duration(20)
    });
    if (result) {
        electrolyzerSuccess++;
    } else {
        electrolyzerFailed++;
    }
})
 
var timer_ele = DShanhaiRecipeEngine.endTimer(timer_electrolyzer)
    
// ========== ae2_overclocked 模组配方 ==========
if (Platform.isLoaded('ae2_overclocked')){
    
    var ocRecipes = [
        { id: '2x', input: ['ae2:crafting_accelerator','ae2:advanced_card','ae2:fluix_crystal'], output: 'ae2_overclocked:parallel_card', EUt: lv },
        { id: '8x', input: ['3x ae2_overclocked:parallel_card'], output: 'ae2_overclocked:parallel_card_8x', EUt: mv },
        { id: '64x', input: ['3x ae2_overclocked:parallel_card_8x'], output: 'ae2_overclocked:parallel_card_64x', EUt: hv },
        { id: '1024x', input: ['3x ae2_overclocked:parallel_card_64x'], output: 'ae2_overclocked:parallel_card_1024x', EUt: ev },
        { id: 'max_x', input: ['4x ae2_overclocked:parallel_card_1024x'], output: 'ae2_overclocked:parallel_card_max', EUt: 20 },
        { id: 'capacity_card', input: ['gtlcore:cell_component_64m','ae2:advanced_card','ae2:spatial_cell_component_128'], output: 'ae2_overclocked:capacity_card', EUt: mv },
        { id: 'super_energy_card', input: ['4x ae2:energy_card','ae2:advanced_card'], output: 'ae2_overclocked:super_energy_card', EUt: mv },
        { id: 'super_speed_card', input: ['ae2:speed_card','minecraft:dragon_breath'], output: 'ae2_overclocked:super_speed_card', EUt: MV },
        { id: 'overclock_card', input: ['ae2_overclocked:super_speed_card','4x minecraft:dragon_breath'], output: 'ae2_overclocked:overclock_card', EUt: iv }
    ];
 
    ocRecipes.forEach(recipe => {
        safeAddRecipe('assembler', `dishanhai:${recipe.id}`, () => {
            let ass = gtr.assembler(`dishanhai:${recipe.id}`);
            ass.itemInputs.apply(ass, recipe.input);
            ass.itemOutputs(recipe.output);
            ass.EUt(recipe.EUt).duration(20);
        });
    });
    
    // 移除原版配方
    let removeOutputs = ['ae2_overclocked:parallel_card','ae2_overclocked:parallel_card_8x','ae2_overclocked:parallel_card_64x','ae2_overclocked:parallel_card_max','ae2_overclocked:capacity_card','ae2_overclocked:super_energy_card','ae2_overclocked:super_speed_card','ae2_overclocked:overclock_card'];
    removeOutputs.forEach(output => {
        e.remove({output: output});
        debug(`移除原版配方: ${output}`);
    });
}

console.log('[山海的配方库] ServerEvents.recipes 执行到末尾');

        })
