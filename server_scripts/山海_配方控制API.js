// priority: 80
// ========== 山海私货 · 配方控制API (独立文件) ==========
// 版本: v2.7.0
// 描述: 允许玩家通过聊天命令控制配方修改和配方加载状态的独立API
// 作者: 山海恒长在/dishanhai
// 使用方法: 将此文件放入server_scripts目录，重启服务器即可使用
// 聊天命令: /配方修改 <配方ID> <字段> <值>
//            /配方信息 <配方ID>
//            /配方列表 [数组名]
//            /配方开关 <配方ID> <开/关>
//            /配方状态 <配方ID>
//            /配方列表已启用
//            /配方列表已禁用
//            /配方重置配置
//            /配方确认重置
//            /配方诊断
//            /配方扫描注册
// =====================================================

// ========== 重要提示 ==========
// 此API允许玩家动态修改配方，请谨慎使用！
// 建议仅限OP玩家使用，或在受控环境下使用。
// ==============================
//IIFE已就绪...
(function() {
    // 加载Java类（KubeJS 6兼容性）- 使用 try-catch 防止类过滤器阻止
    var File = null, FileReader = null, BufferedReader = null;
    if (typeof Java !== 'undefined' && typeof Java.loadClass === 'function') {
        try {
            File = Java.loadClass('java.io.File');
            FileReader = Java.loadClass('java.io.FileReader');
            BufferedReader = Java.loadClass('java.io.BufferedReader');
            console.log('§b[配方控制API] Java类加载完成');
        } catch (e) {
            console.log('§e[配方控制API] Java类加载被阻止（KubeJS安全机制），将使用JsonIO备选方案');
            File = null;
            FileReader = null;
            BufferedReader = null;
        }
    } else {
        console.log('§e[配方控制API] Java API不可用，将使用JsonIO');
    }
    // 自动配方注册开关
    var AUTO_REGISTER_RECIPES = false;  // 禁用自动注册（防止覆盖重置操作）
    if (typeof global !== 'undefined') {
        global.AUTO_REGISTER_RECIPES = false; // 全局开关，便于测试脚本访问
    }

// =====================================================
// =============== 日志模块 ==================
// =====================================================

var LOG_PREFIX = '§b[配方控制API]§r';
var LOG_LEVEL = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
var currentLogLevel = LOG_LEVEL.INFO;
var isConfigInitialized = false;
var DEFAULT_CONFIG_PATH = 'kubejs/data/shanhai_recipe_defaults.json';
var DISABLE_AUTO_MERGE_DEFAULTS = true; // 禁用自动合并默认值，防止配置覆盖
var defaultConfig;

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
// =============== 错误保护模块 ==================
// =====================================================

/**
 * 创建受错误保护的函数包装器
 * 
 * 此包装器确保函数执行不会被KubeJS错误处理强行打断，
 * 完整捕获所有错误信息并发送到日志系统。
 * 
 * @param {Function} originalFunc - 原始函数
 * @param {string} functionName - 函数名称（用于日志记录）
 * @param {any} defaultValue - 出错时返回的默认值（可选）
 * @returns {Function} 受错误保护的包装函数
 */
function createProtectedFunction(originalFunc, functionName, defaultValue) {
    return function() {
        try {
            // 正常执行原始函数
            return originalFunc.apply(this, arguments);
        } catch (err) {
            // 完整捕获错误信息
            var errorDetails = {
                timestamp: new Date().toISOString(),
                functionName: functionName,
                errorMessage: err.message,
                errorStack: err.stack,
                arguments: Array.prototype.slice.call(arguments),
                source: 'shanhaiRecipeControlAPI'
            };
            
            // 构建完整的错误报告
            var fullErrorMessage = '❌ 全局API执行错误 - 函数: ' + functionName + '\n' +
                                 '   消息: ' + err.message + '\n' +
                                 '   堆栈: ' + (err.stack || '无堆栈信息') + '\n' +
                                 '   参数: ' + JSON.stringify(Array.prototype.slice.call(arguments)) + '\n' +
                                 '   时间: ' + new Date().toLocaleString();
            
            // 同时发送到多个日志渠道，确保不丢失
            // 1. 发送到控制台（KubeJS会捕获）
            console.error('[山海API错误保护] ' + fullErrorMessage);
            
            // 2. 发送到自定义日志系统
            error('全局API错误保护捕获: ' + functionName + ' - ' + err.message);
            debug('错误详情: ' + JSON.stringify(errorDetails));
            
            // 3. 额外记录到全局错误存储（如果需要）
            if (typeof global !== 'undefined') {
                if (!global.shanhaiAPIErrors) {
                    global.shanhaiAPIErrors = [];
                }
                // 限制错误历史数量，避免内存泄漏
                if (global.shanhaiAPIErrors.length > 100) {
                    global.shanhaiAPIErrors.shift();
                }
                global.shanhaiAPIErrors.push(errorDetails);
            }
            
            // 返回默认值（如果提供了），否则返回null
            return defaultValue !== undefined ? defaultValue : null;
        }
    };
}

/**
 * 获取函数的智能默认值
 * 
 * 根据函数名称和预期返回类型，返回适当的默认值
 * 确保API出错时返回合理的值，而不是中断执行
 * 
 * @param {string} functionName - 函数名称
 * @returns {any} 适当的默认值
 */
function getDefaultValueForFunction(functionName) {
    // 根据函数名称返回适当的默认值
    switch(functionName) {
        // 布尔值函数 - 返回适当默认值
        case 'isRecipeEnabled':
            return false;  // 配方控制函数出错时默认禁用，确保安全
        case 'isPlayerOp':
            return true;   // 权限检查函数出错时默认不允许
        
        // 数组函数 - 返回空数组
        case 'getEnabledRecipes':
        case 'getDisabledRecipes':
        case 'batchSetRecipeEnabled':
            return [];
        
        // 对象函数 - 返回空对象
        case 'getAllRecipeLoadConfig':
        case 'getModifiableFields':
        case 'getRecipeInfo':
        case 'exportRecipeLoadConfig':
            return {};
        
        // 查找函数 - 返回null（未找到）
        case 'findRecipeById':
            return null;
        
        // 操作结果函数 - 返回false（操作失败）
        case 'modifyRecipe':
        case 'updateRecipeField':
        case 'setRecipeEnabled':
        case 'resetRecipeLoadConfig':
        case 'importRecipeLoadConfig':
        case 'validateRecipeModification':
            return false;
        
        // 命令处理函数 - 返回false（命令执行失败）
        case 'handleModifyCommand':
        case 'handleInfoCommand':
        case 'handleListCommand':
        case 'handleHelpCommand':
        case 'handleRecipeSwitchCommand':
        case 'handleRecipeStatusCommand':
        case 'handleEnabledListCommand':
        case 'handleDisabledListCommand':
        case 'handleRecipeConfigResetCommand':
        case 'handleRecipeConfirmResetCommand':
            return false;
        
        // 工具函数 - 返回null或适当默认值
        case 'sendMessageToPlayer':
            return undefined; // 无返回值
        
        // 默认情况 - 返回null
        default:
            return null;
    }
}

/**
 * 保护所有API函数，防止被KubeJS错误处理打断
 * 
 * @param {Object} apiObject - API对象
 * @returns {Object} 受保护的API对象
 */
function protectAllAPIFunctions(apiObject) {
    var protectedAPI = {};
    
    for (var key in apiObject) {
        if (apiObject.hasOwnProperty(key)) {
            var func = apiObject[key];
            
            if (typeof func === 'function') {
                // 获取智能默认值
                var defaultValue = getDefaultValueForFunction(key);
                
                // 为函数创建保护包装器
                protectedAPI[key] = createProtectedFunction(func, key, defaultValue);
                debug('已添加错误保护到函数: ' + key + ' (默认值: ' + JSON.stringify(defaultValue) + ')');
            } else {
                // 非函数属性直接复制
                protectedAPI[key] = func;
            }
        }
    }
    
    return protectedAPI;
}

// =====================================================
// =============== 核心功能模块 ==================
// =====================================================

/**
 * 规范化配方ID，用于模糊匹配
 * 移除所有空格、下划线、连字符、冒号、单引号和双引号，转换为小写
 * 与山海_配方验证API.js中的normalizeRecipeId函数保持一致
 */
function normalizeRecipeId(id) {
    // 支持Java字符串对象
    if (id === null || id === undefined) return '';
    
    try {
        var strId = String(id);
        return strId.toLowerCase()
            .replace(/\s+/g, '')     // 移除所有空格
            .replace(/_/g, '')       // 移除下划线
            .replace(/-/g, '')       // 移除连字符
            .replace(/:/g, '')       // 移除冒号（命名空间分隔符）
            .replace(/['"]/g, '')    // 移除单引号和双引号
            .trim();
    } catch (err) {
        return '';
    }
}

/**
 * 查找配方配置键
 * 使用与isRecipeEnabled相同的匹配逻辑查找配方在配置中的键
 * 
 * @param {string} recipeId - 配方ID
 * @returns {string|null} 匹配的配置键，如果未找到则返回null
 */
function findRecipeConfigKey(recipeId) {
    // 支持Java字符串对象
    if (recipeId === null || recipeId === undefined) {
        return null;
    }
    
    // 检查配置是否可能已损坏或未加载（条目数量极少）
    var keyCount = recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).length : 0;
    if (keyCount < 3) {
        // 配置条目很少，可能未正确加载，尝试重新加载一次
        debug('配置条目很少（' + keyCount + '），尝试重新加载配置...');
        try {
            initRecipeLoadConfig(true);
            var newKeyCount = recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).length : 0;
            if (newKeyCount > keyCount) {
                debug('配置重新加载成功: ' + keyCount + ' -> ' + newKeyCount + ' 个条目');
            }
        } catch (reloadErr) {
            debug('配置重新加载失败: ' + reloadErr.message);
        }
    }
    
    // 将recipeId转换为字符串（支持Java字符串对象）
    try {
        recipeId = String(recipeId);
    } catch (err) {
        debug('findRecipeConfigKey: 无法将recipeId转换为字符串 - ' + err.message);
        return null;
    }
    
    if (!recipeId.trim()) {
        return null;
    }
    
    // 1. 直接匹配
    if (recipeLoadConfig.hasOwnProperty(recipeId)) {
        debug('配方配置键查找（直接匹配）: ' + recipeId);
        return recipeId;
    }
    
    // 2. 尝试处理dishanhai:/dishanahi:前缀的兼容性
    // 如果ID以dishanhai:开头，也检查去掉前缀的版本
    if (recipeId.startsWith('dishanhai:')) {
        var shortId = recipeId.substring(10); // 去掉'dishanhai:'前缀
        debug('尝试去掉dishanhai:前缀匹配: ' + recipeId + ' -> ' + shortId);
        if (recipeLoadConfig.hasOwnProperty(shortId)) {
            debug('配方配置键匹配成功: ' + recipeId + ' -> ' + shortId + ' = ' + recipeLoadConfig[shortId]);
            return shortId;
        }
    } 
    // 如果ID以dishanahi:开头，也检查去掉前缀的版本
    else if (recipeId.startsWith('dishanahi:')) {
        var shortId = recipeId.substring(9); // 去掉'dishanahi:'前缀
        debug('尝试去掉dishanahi:前缀匹配: ' + recipeId + ' -> ' + shortId);
        if (recipeLoadConfig.hasOwnProperty(shortId)) {
            debug('配方配置键匹配成功: ' + recipeId + ' -> ' + shortId + ' = ' + recipeLoadConfig[shortId]);
            return shortId;
        }
    }
    // 如果ID不以dishanhai:或dishanahi:开头，也检查加上前缀的版本
    else if (!recipeId.includes(':')) {
        // 检查dishanhai:前缀
        var prefixedId = 'dishanhai:' + recipeId;
        if (recipeLoadConfig.hasOwnProperty(prefixedId)) {
            debug('配方配置键查找（添加前缀匹配）: ' + recipeId + ' -> ' + prefixedId);
            return prefixedId;
        }
        // 检查dishanahi:前缀
        var prefixedId2 = 'dishanahi:' + recipeId;
        if (recipeLoadConfig.hasOwnProperty(prefixedId2)) {
            debug('配方配置键查找（添加前缀匹配）: ' + recipeId + ' -> ' + prefixedId2);
            return prefixedId2;
        }
    }
    
    // 3. 尝试规范化匹配（移除空格、下划线、连字符、冒号，转换为小写）
    var normalizedRecipeId = normalizeRecipeId(recipeId);
    if (normalizedRecipeId) {
        // 遍历所有配置键，查找规范化匹配
        for (var key in recipeLoadConfig) {
            if (recipeLoadConfig.hasOwnProperty(key)) {
                var normalizedKey = normalizeRecipeId(key);
                if (normalizedKey === normalizedRecipeId) {
                    debug('配方配置键查找（规范化匹配）: ' + recipeId + ' -> ' + key + ' (规范化: ' + normalizedRecipeId + ')');
                    return key;
                }
            }
        }
    }
    
    // 未找到匹配的配置键
    debug('配方配置键查找（未找到）: ' + recipeId);
    return null;
}

// 配方查找函数
// 注意：此函数假设配方数组已定义为全局变量（如 global.assrecipes)
// 如果您的配方数组是局部变量，请修改此函数以引用正确的变量
function findRecipeById(id) {
    // 支持Java字符串对象
    if (id === null || id === undefined) {
        debug('findRecipeById: 输入id为null或undefined');
        return null;
    }
    
    // 将id转换为字符串（支持Java字符串对象）
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
    
    // 定义所有可能的配方数组
    // 这些数组需要在使用前定义为全局变量，例如：global.assrecipes = [...]
    var recipeArrays = [
        global.assrecipes,          // 组装机配方数组
        global.universalRecipes,    // 通用配方数组  
        global.suprecipes_1,        // 超级配方数组
        global.recipes_voidfluxs,   // 虚空通量配方数组
        global.dishanhairecipes,    // 山海自定义配方数组
        global.recipes,             // 基础配方数组
        global.recipes_electrolyzers // 电解机配方数组
    ];
    
    // 记录哪些数组可用
    var arrayNames = ['assrecipes', 'universalRecipes', 'suprecipes_1', 'recipes_voidfluxs', 'dishanhairecipes', 'recipes', 'recipes_electrolyzers'];
    for (var a = 0; a < recipeArrays.length; a++) {
        if (recipeArrays[a] && Array.isArray(recipeArrays[a])) {
            debug('  数组 ' + arrayNames[a] + ': 有 ' + recipeArrays[a].length + ' 个配方');
        } else {
            debug('  数组 ' + arrayNames[a] + ': 未定义或不是数组');
        }
    }
    
    var normalizedId = normalizeRecipeId(id);
    debug('findRecipeById: 规范化ID="' + normalizedId + '"');
    
    // 遍历所有数组查找配方
    for (var i = 0; i < recipeArrays.length; i++) {
        var arr = recipeArrays[i];
        if (!arr) continue;
        for (var j = 0; j < arr.length; j++) {
            var recipe = arr[j];
            if (!recipe || !recipe.id) continue;
            
            // 1. 精确匹配
            if (recipe.id === id) {
                debug('findRecipeById: 通过精确匹配找到配方 "' + recipe.id + '" (数组: ' + getArrayName(arr) + '[' + j + '])');
                return {
                    recipe: recipe,
                    arrayName: getArrayName(arr),
                    index: j
                };
            }
            
            // 2. 小写匹配
            if (recipe.id.toLowerCase() === id.toLowerCase()) {
                debug('findRecipeById: 通过小写匹配找到配方 "' + recipe.id + '" (数组: ' + getArrayName(arr) + '[' + j + '])');
                return {
                    recipe: recipe,
                    arrayName: getArrayName(arr),
                    index: j
                };
            }
            
            // 3. 规范化匹配（移除空格、下划线、连字符等）
            var recipeNormalizedId = normalizeRecipeId(recipe.id);
            if (recipeNormalizedId === normalizedId) {
                debug('findRecipeById: 通过规范化匹配找到配方 "' + recipe.id + '" -> "' + recipeNormalizedId + '" (数组: ' + getArrayName(arr) + '[' + j + '])');
                return {
                    recipe: recipe,
                    arrayName: getArrayName(arr),
                    index: j
                };
            }
        }
    }
    debug('findRecipeById: 未找到配方 "' + id + '" (规范化ID: "' + normalizedId + '")');
    return null;
}

function getArrayName(arr) {
    // 通过全局变量查找数组名称
    if (arr === global.assrecipes) return 'assrecipes';
    if (arr === global.universalRecipes) return 'universalRecipes';
    if (arr === global.suprecipes_1) return 'suprecipes_1';
    if (arr === global.recipes_voidfluxs) return 'recipes_voidfluxs';
    if (arr === global.dishanhairecipes) return 'dishanhairecipes';
    if (arr === global.recipes) return 'recipes';
    if (arr === global.recipes_electrolyzers) return 'recipes_electrolyzers';
    return '未知数组';
}

// 配方验证函数
function validateRecipe(recipe, gtr) {
    // 检查机器类型
    if (!gtr[recipe.type]) {
        return { valid: false, error: '未知机器类型: ' + recipe.type };
    }
    
    // 检查GT机器配方的必需参数
    var isGtRecipe = gtr[recipe.type] !== undefined;
    if (isGtRecipe) {
        // 检查duration参数
        if (recipe.duration == null) {
            return { valid: false, error: 'duration值缺失' };
        }
        // 检查EUt参数（除了cosmos_simulation类型）
        if (recipe.type !== 'cosmos_simulation' && recipe.EUt == null) {
            return { valid: false, error: 'EUt值缺失' };
        }
    }
    
    return { valid: true };
}

// =====================================================
// =============== 配方加载控制模块 ==================
// =====================================================

// 配方加载状态配置存储
var recipeLoadConfig = {};

// 将Java Map（JsonIO返回）转为原生JS对象，避免Rhino for..in遍历Java索引
function toNativeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    var result = {};
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) { result[keys[i]] = obj[keys[i]]; }
    return result;
}

/**
 * 初始化配方加载配置
 * 从持久化存储加载配置，如果不存在则使用默认值
 */
function initRecipeLoadConfig(forceReload) {
    // 如果已经初始化且不是强制重新加载，则跳过
    if (isConfigInitialized && forceReload !== true) {
        debug('配置已初始化，跳过重复初始化');
        return;
    }
    
    // 移除强制创建默认配置的早期返回逻辑
    // 现在让函数继续执行文件加载逻辑，只在所有加载失败时才使用默认配置
    
    debug('开始初始化配方加载配置...');
    debug('当前recipeLoadConfig类型: ' + typeof recipeLoadConfig + ', 键数量: ' + (recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).length : 'N/A'));
    
    debug('开始初始化配方加载配置...');
    debug('当前recipeLoadConfig类型: ' + typeof recipeLoadConfig + ', 键数量: ' + (recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).length : 'N/A'));
    
    try {
        // ========== 新增：优先从默认值文件恢复 ==========
        // DEFAULT_CONFIG_PATH 已在外部定义
        defaultConfig = null;
        
        // 尝试加载默认配置
        try {
            if (typeof JsonIO !== 'undefined' && typeof JsonIO.read === 'function') {
                defaultConfig = toNativeObject(JsonIO.read(DEFAULT_CONFIG_PATH));
            } else {
                // 使用 Java 文件操作
                if (!File || !FileReader || !BufferedReader) {
                    console.error('§c[配方控制API] Java类未加载，无法读取默认配置文件');
                } else {
                    var file = new File(DEFAULT_CONFIG_PATH);
                    if (file.exists()) {
                        var reader = new FileReader(file);
                        var buffer = new BufferedReader(reader);
                        var content = '';
                        var line;
                        while ((line = buffer.readLine()) !== null) {
                            content += line + '\n';
                        }
                        buffer.close();
                        reader.close();
                        defaultConfig = JSON.parse(content);
                    }
                }
            }
        } catch (err) {
            debug('加载默认配置失败: ' + err.message);
        }
        // ========== 新增结束 ==========
        
        // 首先尝试从文件加载
        var loaded = false;
        
        // 尝试多个可能的配置文件路径
        var possiblePaths = [
            'kubejs/data/shanhai_recipe_load_config.json',  // 原路径
            'data/shanhai_recipe_load_config.json',         // 如果kubejs是工作目录
            './data/shanhai_recipe_load_config.json',       // 相对路径
            '../kubejs/data/shanhai_recipe_load_config.json' // 如果从其他目录调用
        ];
        
        for (var i = 0; i < possiblePaths.length && !loaded; i++) {
            var CONFIG_PATH = possiblePaths[i];
            try {
                debug('尝试从文件加载配置 [' + (i+1) + '/' + possiblePaths.length + ']: ' + CONFIG_PATH);
                debug('JsonIO类型: ' + typeof JsonIO + ', JsonIO.read类型: ' + (typeof JsonIO !== 'undefined' ? typeof JsonIO.read : 'undefined'));
                
                // 方法1：使用 JsonIO（首选）
                if (typeof JsonIO !== 'undefined' && typeof JsonIO.read === 'function') {
                    var fileConfig = JsonIO.read(CONFIG_PATH);
                    debug('JsonIO.read返回类型: ' + typeof fileConfig + ', 值: ' + (fileConfig ? '非空' : '空'));
                    
                    if (fileConfig && typeof fileConfig === 'object') {
                        recipeLoadConfig = toNativeObject(fileConfig);
                        loaded = true;
                        debug('✅ 配方加载配置已从文件加载: ' + Object.keys(recipeLoadConfig).length + ' 个条目 (路径: ' + CONFIG_PATH + ')');
                        debug('加载的配置键示例: ' + (Object.keys(recipeLoadConfig).slice(0, 5).join(', ') || '无'));
                        break; // 加载成功，跳出循环
                    } else {
                        debug('JsonIO返回无效配置: 类型=' + typeof fileConfig + ', 值=' + fileConfig);
                        
                        // JsonIO返回null或undefined，尝试使用fs模块检查文件是否存在
                        try {
                            if (!File || !FileReader || !BufferedReader) {
                                debug('Java类未加载，无法使用文件操作');
                            } else {
                                var file = new File(CONFIG_PATH);
                                if (file.exists()) {
                                    debug('文件存在，但JsonIO读取失败，尝试使用Java文件操作读取...');
                                    try {
                                        var reader = new FileReader(file);
                                        var buffer = new BufferedReader(reader);
                                        var fileContent = '';
                                        var line;
                                        while ((line = buffer.readLine()) !== null) {
                                            fileContent += line + '\n';
                                        }
                                        buffer.close();
                                        reader.close();
                                        
                                        debug('文件内容长度: ' + fileContent.length + ' 字符');
                                        debug('文件内容前200字符: ' + fileContent.substring(0, 200));
                                        
                                        // 尝试解析JSON
                                        var parsedConfig = JSON.parse(fileContent);
                                        if (parsedConfig && typeof parsedConfig === 'object') {
                                            recipeLoadConfig = toNativeObject(parsedConfig);
                                            loaded = true;
                                            debug('✅ 通过Java文件操作加载配置成功: ' + Object.keys(recipeLoadConfig).length + ' 个条目 (路径: ' + CONFIG_PATH + ')');
                                            break; // 加载成功，跳出循环
                                        } else {
                                            debug('Java文件操作读取的JSON无效: 类型=' + typeof parsedConfig);
                                        }
                                    } catch (parseErr) {
                                        debug('解析JSON失败: ' + parseErr.message);
                                    }
                                } else {
                                    debug('配置文件不存在: ' + CONFIG_PATH);
                                }
                            }
                        } catch (fsErr) {
                            debug('检查文件存在性失败: ' + fsErr.message);
                        }
                    }
                } else {
                    debug('JsonIO API不可用，尝试使用Java文件操作...');
                    try {
                        if (!File || !FileReader || !BufferedReader) {
                            debug('Java类未加载，无法使用文件操作');
                        } else {
                            var file = new File(CONFIG_PATH);
                            if (file.exists()) {
                                var reader = new FileReader(file);
                                var buffer = new BufferedReader(reader);
                                var fileContent = '';
                                var line;
                                while ((line = buffer.readLine()) !== null) {
                                    fileContent += line + '\n';
                                }
                                buffer.close();
                                reader.close();
                                
                                var parsedConfig = JSON.parse(fileContent);
                                if (parsedConfig && typeof parsedConfig === 'object') {
                                    recipeLoadConfig = toNativeObject(parsedConfig);
                                    loaded = true;
                                    debug('✅ 通过Java文件操作加载配置成功');
                                    break;
                                }
                            } else {
                                debug('配置文件不存在: ' + CONFIG_PATH);
                            }
                        }
                    } catch (fsErr) {
                        debug('Java文件操作加载失败: ' + fsErr.message);
                    }
                }
            } catch (fsErr) {
                debug('从文件加载配置失败 (路径: ' + CONFIG_PATH + '): ' + fsErr.message);
                debug('错误堆栈: ' + (fsErr.stack || '无堆栈信息'));
            }
        }
        
        // ========== 修复：如果文件配置为空，使用空配置（绝不从默认值文件覆盖）==========
        if (!loaded || (recipeLoadConfig && typeof recipeLoadConfig === 'object' && Object.keys(recipeLoadConfig).length === 0)) {
            // 重要：永远不要用默认配置覆盖用户的配置
            // 即使用户的配置文件是空的，也不应该被默认值覆盖
            recipeLoadConfig = {};
            loaded = true;
            debug('配方加载配置已初始化（空配置），不会从默认值文件覆盖');
            
            // 注意：不自动保存空配置，保持原文件不变
            // 如果用户想要默认配置，可以使用 /配方扫描注册 命令手动添加
        }
        // ========== 修复结束 ==========
        
        // 如果文件加载失败，尝试从 global 加载
        if (!loaded && typeof global !== 'undefined') {
            debug('检查global.shanhaiRecipeLoadConfig: ' + (global.shanhaiRecipeLoadConfig ? '已定义' : '未定义'));
            if (global.shanhaiRecipeLoadConfig) {
                recipeLoadConfig = global.shanhaiRecipeLoadConfig;
                loaded = true;
                debug('配方加载配置已从全局存储加载: ' + Object.keys(recipeLoadConfig).length + ' 个条目');
            }
        }
        
        // 如果都没有，检查当前recipeLoadConfig是否有数据
        if (!loaded) {
            // 检查当前的recipeLoadConfig是否已经有数据
            var currentKeyCount = recipeLoadConfig && typeof recipeLoadConfig === 'object' && !Array.isArray(recipeLoadConfig) ? Object.keys(recipeLoadConfig).length : 0;
            
            if (currentKeyCount > 0) {
                // 当前已经有数据，保留现有配置
                debug('无法从存储加载配置，但当前已有 ' + currentKeyCount + ' 个配方配置，保留当前配置');
                debug('当前配置键: ' + Object.keys(recipeLoadConfig).slice(0, 10).join(', '));
            } else {
                // 当前没有数据，尝试从备份文件恢复
                debug('当前配置为空，尝试从备份文件恢复...');
                var backupLoaded = false;
                var BACKUP_PATH = 'kubejs/data/shanhai_recipe_load_config_backup.json';
                
                try {
                    if (typeof JsonIO !== 'undefined' && typeof JsonIO.read === 'function') {
                        var backupConfig = JsonIO.read(BACKUP_PATH);
                        if (backupConfig && typeof backupConfig === 'object' && Object.keys(backupConfig).length > 0) {
                            recipeLoadConfig = toNativeObject(backupConfig);
                            backupLoaded = true;
                            debug('✅ 已从备份文件恢复配置: ' + Object.keys(recipeLoadConfig).length + ' 个条目');
                        }
                    }
                } catch (backupErr) {
                    debug('使用JsonIO读取备份文件失败: ' + backupErr.message);
                }
                
                // 如果JsonIO失败，尝试fs模块
                if (!backupLoaded) {
                    try {
                        if (!File || !FileReader || !BufferedReader) {
                            debug('Java类未加载，无法读取备份文件');
                        } else {
                            var file = new File(BACKUP_PATH);
                            if (file.exists()) {
                                var reader = new FileReader(file);
                                var buffer = new BufferedReader(reader);
                                var fileContent = '';
                                var line;
                                while ((line = buffer.readLine()) !== null) {
                                    fileContent += line + '\n';
                                }
                                buffer.close();
                                reader.close();
                                
                                var parsedBackup = JSON.parse(fileContent);
                                if (parsedBackup && typeof parsedBackup === 'object' && Object.keys(parsedBackup).length > 0) {
                                    recipeLoadConfig = parsedBackup;
                                    backupLoaded = true;
                                    debug('✅ 已从备份文件恢复配置: ' + Object.keys(recipeLoadConfig).length + ' 个条目');
                                }
                            } else {
                                debug('备份文件不存在: ' + BACKUP_PATH);
                            }
                        }
                    } catch (fsErr) {
                        debug('使用Java文件操作读取备份文件失败: ' + fsErr.message);
                    }
                }
                
                if (!backupLoaded) {
                    // 尝试使用默认配置
                    if (defaultConfig && typeof defaultConfig === 'object' && Object.keys(defaultConfig).length > 0) {
                        recipeLoadConfig = JSON.parse(JSON.stringify(defaultConfig));
                        debug('✅ 从默认配置恢复，共 ' + Object.keys(recipeLoadConfig).length + ' 个条目');
                    } else {
                        debug('尝试使用硬编码默认配置作为最后的后备选项');
                        // 硬编码默认配置（11个关键配方开关）
                        recipeLoadConfig = {
                            "overclock_card": true,
                            "2x": true,
                            "8x": true,
                            "64x": true,
                            "1024x": true,
                            "max_x": true,
                            "capacity_card": true,
                            "super_energy_card": true,
                            "super_speed_card": true,
                            "cztj": false,
                            "creator_God_home": true  // 注意：用户配置中为true，硬编码中为false
                        };
                        debug('✅ 已加载硬编码默认配置，共 ' + Object.keys(recipeLoadConfig).length + ' 个条目');
                    }
                }
            }
        }
        
        // ========== 智能默认值加载和配置完整性检查 ==========
        var currentKeyCount = recipeLoadConfig && typeof recipeLoadConfig === 'object' && !Array.isArray(recipeLoadConfig) ? Object.keys(recipeLoadConfig).length : 0;
        debug('当前配置有 ' + currentKeyCount + ' 个条目');
        
        // 总是尝试加载默认值文件，用于补充缺失的配置
        defaultConfig = null;
        
        try {
            if (typeof JsonIO !== 'undefined' && typeof JsonIO.read === 'function') {
                defaultConfig = toNativeObject(JsonIO.read(DEFAULT_CONFIG_PATH));
            } else {
                try {
                    if (!File || !FileReader || !BufferedReader) {
                        debug('Java类未加载，无法读取默认值文件');
                    } else {
                        var file = new File(DEFAULT_CONFIG_PATH);
                        if (file.exists()) {
                            var reader = new FileReader(file);
                            var buffer = new BufferedReader(reader);
                            var fileContent = '';
                            var line;
                            while ((line = buffer.readLine()) !== null) {
                                fileContent += line + '\n';
                            }
                            buffer.close();
                            reader.close();
                            defaultConfig = JSON.parse(fileContent);
                        }
                    }
                } catch (fsErr) {
                    debug('使用Java文件操作读取默认值文件失败: ' + fsErr.message);
                }
            }
            
            if (defaultConfig && typeof defaultConfig === 'object' && Object.keys(defaultConfig).length > 0) {
                var defaultKeyCount = Object.keys(defaultConfig).length;
                debug('默认值文件包含 ' + defaultKeyCount + ' 个条目');
                
                // 检查重置标志，如果刚重置过则跳过默认值合并
                var skipDefaultMerge = false;
                if (typeof global !== 'undefined' && global.shanhaiRecipeConfigJustReset) {
                    debug('检测到重置标志，跳过从默认值文件合并配置');
                    skipDefaultMerge = true;
                    delete global.shanhaiRecipeConfigJustReset; // 清除标志
                }
                
                // 合并默认值到现有配置（不覆盖现有值）
                var mergedCount = 0;
                // 检查是否禁用自动合并默认值
                if (!DISABLE_AUTO_MERGE_DEFAULTS && !skipDefaultMerge) {
                    for (var key in defaultConfig) {
                        if (defaultConfig.hasOwnProperty(key)) {
                            var value = defaultConfig[key];
                            // 确保值是布尔值
                            if (value === true || value === false) {
                                // 如果当前配置中没有这个键，则添加
                                if (!recipeLoadConfig.hasOwnProperty(key)) {
                                    recipeLoadConfig[key] = value;
                                    mergedCount++;
                                }
                            }
                        }
                    }
                } else if (DISABLE_AUTO_MERGE_DEFAULTS) {
                    debug('自动合并默认值已禁用，跳过合并');
                }
                
                if (mergedCount > 0) {
                    currentKeyCount = Object.keys(recipeLoadConfig).length;
                    debug('✅ 已从默认值文件合并 ' + mergedCount + ' 个新配置，现在共有 ' + currentKeyCount + ' 个条目');
                    
                    // 立即保存合并后的配置
                    saveRecipeLoadConfig();
                } else {
                    debug('默认值文件已加载，但所有键都已存在于当前配置中');
                }
                
                // 检查配置完整性：如果配置条目太少，警告用户
                if (currentKeyCount < 20) {
                    warn('⚠️ 警告：配方加载配置只有 ' + currentKeyCount + ' 个条目，这可能不是完整配置！');
                    warn('⚠️ 如果您的配方配置丢失，请检查备份文件或重新生成配置。');
                }
                
                // 如果默认值文件条目也少于20，说明默认值文件可能不完整
                if (defaultKeyCount < 20) {
                    warn('⚠️ 默认值文件只有 ' + defaultKeyCount + ' 个条目，可能不包含所有配方！');
                }
            } else {
                debug('默认值文件不存在或为空');
            }
        } catch (err) {
            debug('从默认值文件加载失败: ' + err.message);
        }
        // ========== 结束智能默认值加载 ==========
        
        // 清理配置：只保留有效的布尔值
        var cleanConfig = {};
        var filteredKeys = [];
        var keptKeys = [];
        for (var key in recipeLoadConfig) {
            if (recipeLoadConfig.hasOwnProperty(key)) {
                var value = recipeLoadConfig[key];
                var valueType = typeof value;
                
                // 更宽松的布尔值检查，处理JsonIO可能返回的对象包装的布尔值
                var isBoolean = false;
                var booleanValue = null;
                
                if (valueType === 'boolean') {
                    // 原生布尔值
                    isBoolean = true;
                    booleanValue = value;
                } else if (valueType === 'object' && value !== null) {
                    // 可能是Java包装的布尔值，尝试获取原始值
                    try {
                        // 尝试转换为字符串，检查是否是"true"或"false"
                        var strValue = String(value).toLowerCase().trim();
                        if (strValue === 'true' || strValue === 'false') {
                            isBoolean = true;
                            booleanValue = strValue === 'true';
                        }
                    } catch (e) {
                        // 转换失败，不是布尔值
                    }
                } else if (valueType === 'string') {
                    // 字符串形式的布尔值
                    var strValue = value.toLowerCase().trim();
                    if (strValue === 'true' || strValue === 'false') {
                        isBoolean = true;
                        booleanValue = strValue === 'true';
                    }
                } else if (valueType === 'number') {
                    // 数字形式的布尔值 (0=false, 其他=true)
                    isBoolean = true;
                    booleanValue = value !== 0;
                }
                
                if (isBoolean) {
                    cleanConfig[key] = booleanValue;
                    keptKeys.push(key + '=' + booleanValue + '(' + valueType + ')');
                } else {
                    filteredKeys.push(key + '=' + value + '(' + valueType + ')');
                }
            }
        }
        recipeLoadConfig = cleanConfig;
        
        if (filteredKeys.length > 0) {
            debug('清理配置时过滤掉 ' + filteredKeys.length + ' 个非布尔值键: ' + filteredKeys.slice(0, 5).join(', '));
        }
        if (keptKeys.length > 0) {
            debug('清理配置时保留 ' + keptKeys.length + ' 个布尔值键: ' + keptKeys.slice(0, 10).join(', '));
        }
        
        // 显示已配置的配方（如果有）
        var keys = Object.keys(recipeLoadConfig);
        if (keys.length > 0) {
            debug('已配置的配方: ' + keys.slice(0, 10).join(', '));
            if (keys.length > 10) {
                debug('... 还有 ' + (keys.length - 10) + ' 个');
            }
        }
    } catch (err) {
        warn('加载配方加载配置时出错: ' + err.message);
        warn('错误堆栈: ' + (err.stack || '无堆栈信息'));
        
        // 尝试从备份文件恢复
        try {
            var BACKUP_PATH = 'kubejs/data/shanhai_recipe_load_config_backup.json';
            debug('尝试从备份文件恢复: ' + BACKUP_PATH);
            
            if (typeof JsonIO !== 'undefined' && typeof JsonIO.read === 'function') {
                var backupConfig = JsonIO.read(BACKUP_PATH);
                if (backupConfig && typeof backupConfig === 'object' && Object.keys(backupConfig).length > 0) {
                    recipeLoadConfig = toNativeObject(backupConfig);
                    warn('✅ 已从备份文件恢复配置: ' + Object.keys(recipeLoadConfig).length + ' 个条目');
                } else {
                    // 备份文件无效，尝试使用Java文件操作
                    if (!File || !FileReader || !BufferedReader) {
                        debug('Java类未加载，无法读取备份文件');
                    } else {
                        try {
                            var file = new File(BACKUP_PATH);
                            if (file.exists()) {
                                var reader = new FileReader(file);
                                var buffer = new BufferedReader(reader);
                                var fileContent = '';
                                var line;
                                while ((line = buffer.readLine()) !== null) {
                                    fileContent += line + '\n';
                                }
                                buffer.close();
                                reader.close();
                                
                                var parsedBackup = JSON.parse(fileContent);
                                if (parsedBackup && typeof parsedBackup === 'object' && Object.keys(parsedBackup).length > 0) {
                                    recipeLoadConfig = parsedBackup;
                                    warn('✅ 已从备份文件恢复配置: ' + Object.keys(recipeLoadConfig).length + ' 个条目');
                                }
                            }
                        } catch (fsErr) {
                            debug('Java文件操作读取备份文件失败: ' + fsErr.message);
                        }
                    }
                }
            }
        } catch (backupErr) {
            debug('备份恢复失败: ' + backupErr.message);
            // 如果备份恢复也失败，检查当前是否有有效配置
            var currentKeys = recipeLoadConfig && typeof recipeLoadConfig === 'object' && !Array.isArray(recipeLoadConfig) ? Object.keys(recipeLoadConfig).length : 0;
            if (currentKeys === 0) {
                // 尝试使用默认配置
                if (defaultConfig && typeof defaultConfig === 'object' && Object.keys(defaultConfig).length > 0) {
                    recipeLoadConfig = JSON.parse(JSON.stringify(defaultConfig));
                    warn('✅ 从默认配置恢复，共 ' + Object.keys(recipeLoadConfig).length + ' 个条目');
                } else {
                    warn('尝试使用硬编码默认配置作为最后的后备选项');
                    // 硬编码默认配置（11个关键配方开关）
                    recipeLoadConfig = {
                        "overclock_card": true,
                        "2x": true,
                        "8x": true,
                        "64x": true,
                        "1024x": true,
                        "max_x": true,
                        "capacity_card": true,
                        "super_energy_card": true,
                        "super_speed_card": true,
                        "cztj": false,
                        "creator_God_home": true  // 注意：用户配置中为true，硬编码中为false
                    };
                    warn('✅ 已加载硬编码默认配置，共 ' + Object.keys(recipeLoadConfig).length + ' 个条目');
                }
            } else {
                warn('无法从备份恢复，但当前已有 ' + currentKeys + ' 个配置，保留当前配置');
            }
        }
    }
    
    var finalKeyCount = recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).length : 0;
    debug('配方加载配置初始化完成，共 ' + finalKeyCount + ' 个配方配置');
    
    // 同步到全局变量，确保主文件和其他脚本可以访问
    if (typeof global !== 'undefined') {
        global.shanhaiRecipeLoadConfig = recipeLoadConfig;
        debug('配方加载配置已同步到全局变量，共 ' + finalKeyCount + ' 个条目');
    }
    
    isConfigInitialized = true;
    if (finalKeyCount === 0) {
        warn('警告：配方加载配置为空！所有配方将默认启用。');
    }
}

/**
 * 重新加载配方加载配置
 * 强制从文件重新加载配置，用于手动修改配置文件后的更新
 * 
 * @returns {number} 重新加载的配置条目数量，-1表示失败
 */
function reloadRecipeLoadConfig() {
    debug('手动重新加载配方加载配置...');
    var previousCount = recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).length : 0;
    
    try {
        // 保存当前配置的备份，以防重新加载失败
        var backupConfig = {};
        for (var key in recipeLoadConfig) {
            if (recipeLoadConfig.hasOwnProperty(key)) {
                backupConfig[key] = recipeLoadConfig[key];
            }
        }
        
        // 调用初始化函数重新加载配置（强制重新加载）
        initRecipeLoadConfig(true);
        
        var newCount = recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).length : 0;
        debug('配置重新加载完成: ' + previousCount + ' -> ' + newCount + ' 个条目');
        
        if (newCount === 0 && previousCount > 0) {
            warn('重新加载后配置为空！恢复备份配置...');
            recipeLoadConfig = toNativeObject(backupConfig);
            newCount = Object.keys(recipeLoadConfig).length;
            debug('已恢复备份配置: ' + newCount + ' 个条目');
        }
        
        return newCount;
    } catch (err) {
        error('重新加载配方加载配置失败: ' + err.message);
        return -1;
    }
}

/**
 * 保存配方加载配置到持久化存储
 */
function saveRecipeLoadConfig() {
    try {
        debug('开始保存配方加载配置...');
        
        var cleanConfig = {};
        for (var key in recipeLoadConfig) {
            if (recipeLoadConfig.hasOwnProperty(key) && 
                typeof recipeLoadConfig[key] === 'boolean') {
                cleanConfig[key] = recipeLoadConfig[key];
            }
        }
        
        var configCount = Object.keys(cleanConfig).length;
        debug('准备保存 ' + configCount + ' 个配置条目');
        
        // ========== 修复：强制写入文件 ==========
        var fileSaved = false;
        var errorMsg = null;
        
        // 1. 保存到全局变量
        if (typeof global !== 'undefined') {
            global.shanhaiRecipeLoadConfig = cleanConfig;
            debug('配置已保存到 global.shanhaiRecipeLoadConfig');
        }
        
        // 2. 强制保存到文件
        var CONFIG_FILE = 'kubejs/data/shanhai_recipe_load_config.json';
        
        try {
            if (typeof JsonIO !== 'undefined' && typeof JsonIO.write === 'function') {
                JsonIO.write(CONFIG_FILE, cleanConfig);
                fileSaved = true;
                info('✅ 配置已写入文件: ' + CONFIG_FILE + ' (' + configCount + ' 个条目)');
            } else {
                errorMsg = 'JsonIO API 不可用';
            }
        } catch (fileErr) {
            errorMsg = fileErr.message;
            error('文件保存失败: ' + errorMsg);
        }
        
        // 3. 尝试备用方法：使用 Java 文件操作
        if (!fileSaved) {
            try {
                var File = Java.loadClass('java.io.File');
                var FileWriter = Java.loadClass('java.io.FileWriter');
                
                var file = new File(CONFIG_FILE);
                if (!file.getParentFile().exists()) {
                    file.getParentFile().mkdirs();
                }
                
                var writer = new FileWriter(file);
                writer.write(JSON.stringify(cleanConfig, null, 2));
                writer.close();
                
                fileSaved = true;
                info('✅ 配置已通过 Java 文件操作写入文件: ' + CONFIG_FILE);
            } catch (javaErr) {
                error('Java 文件操作也失败: ' + javaErr.message);
            }
        }
        
        if (!fileSaved) {
            error('❌ 配置文件写入失败！错误: ' + errorMsg);
            error('   配置已保存到内存，但重启服务器后会丢失');
            return false;
        }
        
        return true;
        
    } catch (err) {
        error('保存配方加载配置失败: ' + err.message);
        return false;
    }
}

/**
 * 获取配方加载状态
 * 
 * @param {string} recipeId - 配方ID
 * @returns {boolean} 配方是否应该加载（默认true）
 */
function isRecipeEnabled(recipeId) {
    // 支持Java字符串对象
    debug('🔍 isRecipeEnabled检查配方: ' + recipeId + '，配置键数量: ' + (recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).length : 0));
    if (recipeId === null || recipeId === undefined) {
        debug('isRecipeEnabled: 配方ID为null或undefined，默认启用');
        return true; // 无效ID默认启用
    }
    
    // 将recipeId转换为字符串（支持Java字符串对象）
    try {
        recipeId = String(recipeId);
        debug('isRecipeEnabled: 转换后的配方ID: ' + recipeId + ' (原始类型: ' + typeof arguments[0] + ')');
    } catch (err) {
        debug('isRecipeEnabled: 无法将recipeId转换为字符串 - ' + err.message);
        return true; // 转换失败默认启用
    }
    
    if (!recipeId.trim()) {
        debug('isRecipeEnabled: 配方ID为空字符串，默认启用');
        return true; // 空字符串默认启用
    }
    
    // 使用统一的配置键查找函数
    debug('isRecipeEnabled: 正在查找配方配置键...');
    var configKey = findRecipeConfigKey(recipeId);
    debug('isRecipeEnabled: 查找到的配置键: ' + (configKey || '未找到'));
    
    if (configKey !== null && recipeLoadConfig.hasOwnProperty(configKey)) {
        var configValue = recipeLoadConfig[configKey];
        // 如果配方被禁用，使用info级别日志；如果启用，使用debug级别
        if (configValue === false) {
            info('🚫 配方加载状态检查: ' + recipeId + ' -> ' + configKey + ' = ' + configValue + ' (禁用)');
        } else {
            debug('✅ 配方加载状态检查: ' + recipeId + ' -> ' + configKey + ' = ' + configValue + ' (启用)');
        }
        return configValue === true;
    }
    
    // 默认启用所有配方
    debug('⚠️ 配方加载状态检查（默认启用）: ' + recipeId);
    if (configKey === null) {
        debug('警告：配方 "' + recipeId + '" 未找到配置，将默认启用。请检查配方ID是否正确或使用/配方开关命令添加配置。');
    } else {
        debug('警告：配方 "' + recipeId + '" 配置键 "' + configKey + '" 不在配置中，将默认启用。');
    }
    return true;
}

/**
 * 设置配方加载状态
 * 
 * @param {string} recipeId - 配方ID
 * @param {boolean} enabled - 是否启用配方
 * @returns {boolean} 是否成功设置
 */
function setRecipeEnabled(recipeId, enabled) {
    debug('setRecipeEnabled 被调用: recipeId="' + recipeId + '", enabled=' + enabled);
    debug('调用时recipeLoadConfig状态 - 类型: ' + typeof recipeLoadConfig + ', 是数组: ' + Array.isArray(recipeLoadConfig) + ', 键数量: ' + (recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).length : 'N/A'));
    
    // 检查 recipeId 是否为 null 或 undefined
    if (recipeId === null || recipeId === undefined) {
        error('设置配方加载状态失败: 配方ID为null或undefined');
        return false;
    }
    
    // 将 recipeId 转换为字符串（支持Java字符串对象）
    try {
        recipeId = String(recipeId).trim();
    } catch (err) {
        error('设置配方加载状态失败: 无法将配方ID转换为字符串 - 收到: ' + recipeId + ' (类型: ' + typeof recipeId + ')');
        return false;
    }
    
    // 检查转换后的字符串是否有效
    if (recipeId === '') {
        error('设置配方加载状态失败: 配方ID为空字符串');
        return false;
    }
    
    // ID规范化：对于dishanhai:/dishanahi:前缀的ID，保存去掉前缀的版本以保持一致性
    var normalizedId = recipeId;
    if (recipeId.startsWith('dishanhai:')) {
        normalizedId = recipeId.substring(10); // 去掉'dishanhai:'前缀 (10个字符)
        debug('ID规范化(dishanhai:): ' + recipeId + ' -> ' + normalizedId);
    } else if (recipeId.startsWith('dishanahi:')) {
        normalizedId = recipeId.substring(9); // 去掉'dishanahi:'前缀 (9个字符)
        debug('ID规范化(dishanahi:): ' + recipeId + ' -> ' + normalizedId);
    }
    
    // 验证规范化后的ID
    if (!normalizedId || normalizedId.trim() === '') {
        error('设置配方加载状态失败: 规范化后的ID无效: "' + normalizedId + '" (原始ID: ' + recipeId + ')');
        return false;
    }
    
    var oldValue = recipeLoadConfig[normalizedId];
    var newValue = enabled === true;
    
    // 如果值没有变化，不执行操作
    if (oldValue === newValue) {
        debug('配方加载状态未变化: ' + normalizedId + ' = ' + newValue + ' (原始ID: ' + recipeId + ')');
        return true;
    }
    
    // 确保recipeLoadConfig是有效对象
    debug('检查recipeLoadConfig有效性 - 值: ' + recipeLoadConfig + ', 类型: ' + typeof recipeLoadConfig + ', 是数组: ' + Array.isArray(recipeLoadConfig));
    if (!recipeLoadConfig || typeof recipeLoadConfig !== 'object' || Array.isArray(recipeLoadConfig)) {
        warn('recipeLoadConfig不是有效对象，正在尝试重新初始化... 类型: ' + typeof recipeLoadConfig);
        debug('当前配置键数量: ' + (recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).length : 0));
        debug('当前配置键列表: ' + (recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).join(', ') : 'N/A'));
        
        // 尝试重新初始化配置
        try {
            debug('开始调用initRecipeLoadConfig()...');
            initRecipeLoadConfig(true);
            debug('已重新调用initRecipeLoadConfig()');
            
            // 检查重新初始化后的状态
            if (recipeLoadConfig && typeof recipeLoadConfig === 'object' && !Array.isArray(recipeLoadConfig)) {
                var keyCount = Object.keys(recipeLoadConfig).length;
                debug('重新初始化成功，当前配置包含 ' + keyCount + ' 个配方');
                debug('重新初始化后配置键列表: ' + (keyCount > 0 ? Object.keys(recipeLoadConfig).slice(0, 10).join(', ') : '空'));
            } else {
                warn('重新初始化后recipeLoadConfig仍然无效，将使用空对象');
                recipeLoadConfig = {};
                debug('已重置recipeLoadConfig为空对象');
            }
        } catch (initErr) {
            warn('重新初始化失败: ' + initErr.message);
            recipeLoadConfig = {};
            debug('已重置recipeLoadConfig为空对象');
        }
    } else {
        debug('recipeLoadConfig有效，当前包含 ' + Object.keys(recipeLoadConfig).length + ' 个配方');
    }
    
    // 更新配置
    recipeLoadConfig[normalizedId] = newValue;
    debug('配置已更新，等待保存: ' + normalizedId + ' = ' + newValue + ' (原始ID: ' + recipeId + ')');
    
    // 验证要保存的值是布尔值
    if (typeof newValue !== 'boolean') {
        warn('警告: 要保存的值不是布尔值，强制转换: ' + newValue + ' -> ' + Boolean(newValue));
        newValue = Boolean(newValue);
        recipeLoadConfig[normalizedId] = newValue;
    }
    
    // 保存配置
    debug('开始调用saveRecipeLoadConfig()...');
    var saved = saveRecipeLoadConfig();
    debug('saveRecipeLoadConfig()返回: ' + saved);
    
    if (saved) {
        info('配方加载状态已更新: ' + normalizedId + ' = ' + newValue + ' (之前: ' + (oldValue !== undefined ? oldValue : '未设置') + ') [原始ID: ' + recipeId + ']');
        
        // 🔧 新增：清除本地默认值，让配置文件优先
        if (typeof global !== 'undefined' && 
            global.shanhaiAPI && 
            typeof global.shanhaiAPI.clearLocalDefault === 'function') {
            var cleared = global.shanhaiAPI.clearLocalDefault(recipeId);
            if (cleared) {
                debug('  已清除配方的本地默认值，配置文件设置现在将生效');
            }
        }
    } else {
        error('❌ 配方加载状态设置失败！');
        error('   可能原因: 配方ID无效或保存配置时出错。');
        error('   详细信息:');
        error('     原始配方ID: ' + recipeId);
        error('     规范化ID: ' + normalizedId);
        error('     目标状态: ' + newValue + ' (' + (newValue ? '启用' : '禁用') + ')');
        error('     recipeLoadConfig类型: ' + typeof recipeLoadConfig);
        error('     recipeLoadConfig键数量: ' + (recipeLoadConfig && typeof recipeLoadConfig === 'object' ? Object.keys(recipeLoadConfig).length : 'N/A'));
        error('     保存函数返回值: ' + saved);
        
        // 尝试诊断global对象状态
        try {
            error('     global对象类型: ' + typeof global);
            if (typeof global !== 'undefined') {
                error('     global.shanhaiRecipeLoadConfig类型: ' + typeof global.shanhaiRecipeLoadConfig);
                if (global.shanhaiRecipeLoadConfig && typeof global.shanhaiRecipeLoadConfig === 'object') {
                    error('     global.shanhaiRecipeLoadConfig键数量: ' + Object.keys(global.shanhaiRecipeLoadConfig).length);
                }
            }
        } catch (globalErr) {
            error('     诊断global对象时出错: ' + globalErr.message);
        }
    }
    
    return saved;
}

/**
 * 批量设置配方加载状态
 * 
 * @param {Object} configs - 配置对象 {recipeId: enabled, ...}
 * @returns {Object} 结果对象 {success: number, failed: number, errors: Array}
 */
function batchSetRecipeEnabled(configs) {
    if (!configs || typeof configs !== 'object') {
        return { success: 0, failed: 0, errors: ['配置参数必须是对象'] };
    }
    
    var result = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    for (var recipeId in configs) {
        if (configs.hasOwnProperty(recipeId)) {
            try {
                var success = setRecipeEnabled(recipeId, configs[recipeId]);
                if (success) {
                    result.success++;
                } else {
                    result.failed++;
                    result.errors.push('设置失败: ' + recipeId);
                }
            } catch (err) {
                result.failed++;
                result.errors.push('设置出错: ' + recipeId + ' - ' + err.message);
            }
        }
    }
    
    info('批量设置配方加载状态完成: 成功 ' + result.success + ' 个，失败 ' + result.failed + ' 个');
    return result;
}

/**
 * 批量设置配方数组的加载状态
 * 
 * @param {string} arrayName - 配方数组名称（如 'assrecipes', 'universalRecipes' 等）
 * @param {boolean} enabled - 是否启用数组中的所有配方
 * @returns {Object} 结果对象 {success: number, failed: number, errors: Array, arrayName: string, recipeCount: number}
 */
function batchSetArrayEnabled(arrayName, enabled) {
    if (!arrayName || typeof arrayName !== 'string') {
        return { success: 0, failed: 0, errors: ['数组名称必须是字符串'], arrayName: arrayName, recipeCount: 0 };
    }
    
    var recipeArray = global[arrayName];
    if (!recipeArray || !Array.isArray(recipeArray)) {
        return { success: 0, failed: 0, errors: ['找不到配方数组: ' + arrayName + ' 或不是数组'], arrayName: arrayName, recipeCount: 0 };
    }
    
    var configs = {};
    var recipeCount = 0;
    
    // 收集数组中的所有配方ID
    for (var i = 0; i < recipeArray.length; i++) {
        var recipe = recipeArray[i];
        if (recipe && recipe.id) {
            var recipeId = recipe.id;
            // 标准化ID（去掉 dishanhai: 前缀）
            if (recipeId.startsWith('dishanhai:')) {
                recipeId = recipeId.substring(10);
            }
            configs[recipeId] = enabled;
            recipeCount++;
        }
    }
    
    if (recipeCount === 0) {
        return { success: 0, failed: 0, errors: ['数组中未找到有效配方'], arrayName: arrayName, recipeCount: 0 };
    }
    
    info('开始批量设置数组 "' + arrayName + '" 的加载状态: 共 ' + recipeCount + ' 个配方，目标状态: ' + (enabled ? '启用' : '禁用'));
    
    // 使用现有的批量设置函数
    var result = batchSetRecipeEnabled(configs);
    result.arrayName = arrayName;
    result.recipeCount = recipeCount;
    
    info('数组 "' + arrayName + '" 批量设置完成: 成功 ' + result.success + ' 个，失败 ' + result.failed + ' 个');
    return result;
}

/**
 * 获取所有配方加载配置
 * 
 * @returns {Object} 配方加载配置对象的副本
 */
function getAllRecipeLoadConfig() {
    // 返回副本以避免直接修改
    var copy = {};
    for (var key in recipeLoadConfig) {
        if (recipeLoadConfig.hasOwnProperty(key)) {
            copy[key] = recipeLoadConfig[key];
        }
    }
    return copy;
}

/**
 * 获取启用的配方列表
 * 
 * @returns {Array} 启用的配方ID数组
 */
function getEnabledRecipes() {
    var enabled = [];
    for (var recipeId in recipeLoadConfig) {
        if (recipeLoadConfig.hasOwnProperty(recipeId) && recipeLoadConfig[recipeId] === true) {
            enabled.push(recipeId);
        }
    }
    return enabled;
}

/**
 * 获取禁用的配方列表
 * 
 * @returns {Array} 禁用的配方ID数组
 */
function getDisabledRecipes() {
    var disabled = [];
    for (var recipeId in recipeLoadConfig) {
        if (recipeLoadConfig.hasOwnProperty(recipeId) && recipeLoadConfig[recipeId] === false) {
            disabled.push(recipeId);
        }
    }
    return disabled;
}

/**
 * 重置配方加载配置（清空所有设置）
 * 
 * @returns {boolean} 是否成功重置
 */
function resetRecipeLoadConfig() {
    info('开始清空所有配方加载配置...');
    // 设置重置标志，防止配置完整性检查从默认值文件恢复
    // 同时禁用自动注册，防止自动注册覆盖重置操作
    if (typeof global !== 'undefined') {
        global.shanhaiRecipeConfigJustReset = true;
        global.AUTO_REGISTER_RECIPES = false;
    }
    
    // 记录原始配置数量
    var originalCount = Object.keys(recipeLoadConfig).length;
    
    // 完全清空配置
    recipeLoadConfig = {};
    
    // 保存空配置
    var saved = saveRecipeLoadConfig();
    
    if (saved) {
        info('✅ 所有配方配置已清空，所有配方将恢复为默认启用状态');
        info('已清除 ' + originalCount + ' 个配方的加载设置');
        return true;
    } else {
        warn('❌ 配方配置清空失败');
        return false;
    }
}

/**
 * 导入配方加载配置
 * 
 * @param {Object} newConfig - 新配置对象
 * @param {boolean} merge - 是否合并到现有配置（true）或替换（false）
 * @returns {Object} 结果对象 {success: boolean, imported: number, total: number}
 */
function importRecipeLoadConfig(newConfig, merge) {
    if (!newConfig || typeof newConfig !== 'object') {
        return { success: false, imported: 0, total: 0, error: '配置参数必须是对象' };
    }
    
    var imported = 0;
    var total = Object.keys(newConfig).length;
    
    if (merge !== true) {
        // 替换模式：清空现有配置
        recipeLoadConfig = {};
    }
    
    // 导入新配置
    for (var recipeId in newConfig) {
        if (newConfig.hasOwnProperty(recipeId)) {
            var value = newConfig[recipeId];
            // 确保值是布尔值
            recipeLoadConfig[recipeId] = value === true;
            imported++;
        }
    }
    
    // 保存配置
    var saved = saveRecipeLoadConfig();
    
    var result = {
        success: saved,
        imported: imported,
        total: total,
        merged: merge === true
    };
    
    if (saved) {
        info('配方加载配置已导入: ' + imported + '/' + total + ' 个条目' + (merge ? ' (合并模式)' : ' (替换模式)'));
    } else {
        result.error = '配置保存失败';
        warn('配方加载配置导入但保存失败');
    }
    
    return result;
}

/**
 * 导出配方加载配置
 * 
 * @returns {Object} 配方加载配置对象
 */
function exportRecipeLoadConfig() {
    return getAllRecipeLoadConfig();
}

/**
 * 导出配方数组到全局对象
 * 
 * 收集所有已知的配方数组并导出到全局对象 global.shanhaiRecipeArrays
 * 方便其他脚本访问和操作配方数据。
 * 
 * @returns {Object} 包含所有配方数组的对象
 */
function exportRecipeArrays() {
    debug('开始导出配方数组到全局对象...');
    
    // 检查全局对象是否存在
    if (typeof global === 'undefined') {
        warn('global 对象未定义，无法导出配方数组');
        return {};
    }
    
    var recipeArrays = {
        assrecipes: null,
        universalRecipes: null,
        suprecipes_1: null,
        recipes_voidfluxs: null,
        dishanhairecipes: null,
        recipes: null,
        recipes_electrolyzers: null
    };
    
    // 收集现有的全局数组
    for (var key in recipeArrays) {
        try {
            if (global.hasOwnProperty(key) && Array.isArray(global[key])) {
                recipeArrays[key] = global[key];
                debug('找到配方数组: ' + key + ' (' + global[key].length + ' 个配方)');
            } else {
                debug('配方数组未找到或无效: ' + key);
            }
        } catch (err) {
            debug('检查配方数组 ' + key + ' 时出错: ' + err.message);
        }
    }
    
    // 导出到全局对象
    global.shanhaiRecipeArrays = recipeArrays;
    debug('配方数组已导出到 global.shanhaiRecipeArrays');
    
    // 同时导出到 API 对象以便访问
    if (global.shanhaiRecipeControlAPI) {
        global.shanhaiRecipeControlAPI.recipeArrays = recipeArrays;
        debug('配方数组已附加到 API 对象');
    }
    
    // 统计信息
    var totalRecipes = 0;
    var availableArrays = [];
    for (var key in recipeArrays) {
        if (recipeArrays[key] && Array.isArray(recipeArrays[key])) {
            totalRecipes += recipeArrays[key].length;
            availableArrays.push(key + ':' + recipeArrays[key].length);
        }
    }
    
    info('配方数组导出完成: ' + availableArrays.length + ' 个数组, 共 ' + totalRecipes + ' 个配方');
    if (availableArrays.length > 0) {
        debug('可用数组: ' + availableArrays.join(', '));
    }
    
    return recipeArrays;
}

// 初始化配置
initRecipeLoadConfig();

// 自动导出配方数组到全局对象（如果启用了自动导出）
try {
    // 检查是否启用自动导出（默认启用）
    var autoExport = typeof global !== 'undefined' && global.AUTO_EXPORT_RECIPE_ARRAYS !== false;
    if (autoExport) {
        debug('自动导出配方数组到全局对象...');
        exportRecipeArrays();
    } else {
        debug('配方数组自动导出已禁用，如需导出请手动调用 exportRecipeArrays()');
    }
} catch (err) {
    warn('自动导出配方数组失败: ' + err.message);
}

/**
 * 自动从配方数组注册配方到加载配置
 * 
 * 扫描所有已导出的配方数组，自动为每个配方创建默认启用配置。
 * 这允许配方控制API自动发现所有可用配方，无需手动注册。
 * 注意：此函数仅注册新配方，不会覆盖已存在的配方配置。
 * 
 * @param {boolean} force - 此参数已弃用，保留以保持API兼容性
 * @returns {number} 新注册的配方数量
 */
function autoRegisterRecipesFromArrays(force) {
    if (typeof global === 'undefined' || !global.shanhaiRecipeArrays) {
        debug('无法自动注册配方：配方数组未导出');
        return 0;
    }
    
    var recipeArrays = global.shanhaiRecipeArrays;
    var totalRegistered = 0;
    var totalSkipped = 0;
    var totalPreserved = 0; // 新增：保留现有状态的配方数量
    
    debug('开始自动从配方数组注册配方...');
    debug('当前已配置配方数量: ' + Object.keys(recipeLoadConfig).length);
    
    for (var arrayName in recipeArrays) {
        var recipeArray = recipeArrays[arrayName];
        if (!recipeArray || !Array.isArray(recipeArray)) {
            continue;
        }
        
        var arrayCount = 0;
        var arrayPreserved = 0;
        for (var i = 0; i < recipeArray.length; i++) {
            var recipe = recipeArray[i];
            if (recipe === null || recipe === undefined || typeof recipe !== 'object') {
                continue;
            }
            
            // 尝试从不同字段提取配方ID（支持Java字符串对象）
            var recipeId = null;
            
            // 尝试从id字段提取
            if (recipe.id !== null && recipe.id !== undefined) {
                try {
                    var idStr = String(recipe.id).trim();
                    if (idStr) {
                        recipeId = idStr;
                    }
                } catch (err) {
                    // 转换失败，继续尝试其他字段
                }
            }
            
            // 如果id字段无效，尝试name字段
            if (!recipeId && recipe.name !== null && recipe.name !== undefined) {
                try {
                    var nameStr = String(recipe.name).trim();
                    if (nameStr) {
                        recipeId = nameStr;
                    }
                } catch (err) {
                    // 转换失败，继续尝试其他字段
                }
            }
            
            // 如果id和name都无效，尝试output字段
            if (!recipeId && recipe.output !== null && recipe.output !== undefined) {
                try {
                    var outputStr = String(recipe.output).trim();
                    if (outputStr) {
                        recipeId = outputStr;
                    }
                } catch (err) {
                    // 转换失败
                }
            }
            
            if (!recipeId) {
                totalSkipped++;
                continue;
            }
            
            // ID规范化：与setRecipeEnabled保持一致
            // 对于dishanhai:/dishanahi:前缀的ID，使用去掉前缀的版本以保持一致性
            var normalizedId = recipeId;
            if (recipeId.startsWith('dishanhai:')) {
                normalizedId = recipeId.substring(10); // 去掉'dishanhai:'前缀 (10个字符)
            } else if (recipeId.startsWith('dishanahi:')) {
                normalizedId = recipeId.substring(9); // 去掉'dishanahi:'前缀 (9个字符)
            } else if (recipeId.includes(':')) {
                // 对于其他命名空间前缀，也移除前缀以保持一致性
                normalizedId = recipeId.split(':')[1] || recipeId;
            }
            
            // 检查是否已经配置过此配方
            var alreadyConfigured = false;
            var existingValue = undefined;
            
            // 检查多种可能的ID格式
            var possibleIds = [
                normalizedId,
                'dishanhai:' + normalizedId,
                'dishanahi:' + normalizedId,
                recipeId // 原始ID
            ];
            
            // 移除重复的ID
            var uniqueIds = [];
            for (var j = 0; j < possibleIds.length; j++) {
                if (uniqueIds.indexOf(possibleIds[j]) === -1) {
                    uniqueIds.push(possibleIds[j]);
                }
            }
            
            // 检查所有可能的ID
            for (var j = 0; j < uniqueIds.length; j++) {
                var testId = uniqueIds[j];
                if (recipeLoadConfig.hasOwnProperty(testId)) {
                    alreadyConfigured = true;
                    existingValue = recipeLoadConfig[testId];
                    debug('ID匹配: "' + recipeId + '" -> "' + testId + '" (值=' + existingValue + ')');
                    break;
                }
            }
            
            if (!alreadyConfigured) {
                // 只有未配置的配方才设置为 true
                recipeLoadConfig[normalizedId] = true;
                arrayCount++;
                totalRegistered++;
            } else {
                // 已存在的配方，保留原有状态（不要覆盖）
                totalPreserved++;
                arrayPreserved++;
                debug('配方已存在，保留状态: ' + normalizedId + ' = ' + existingValue + ' (原始ID: ' + recipeId + ')');
            }
        }
        
        if (arrayCount > 0) {
            debug('从 ' + arrayName + ' 自动注册了 ' + arrayCount + ' 个新配方');
        }
        if (arrayPreserved > 0) {
            debug('从 ' + arrayName + ' 保留了 ' + arrayPreserved + ' 个已有配方的状态');
        }
    }
    
    if (totalRegistered > 0) {
        info('自动配方注册完成: 新增 ' + totalRegistered + ' 个配方，保留 ' + totalPreserved + ' 个现有配方，跳过 ' + totalSkipped + ' 个无效配方');
        
        // 自动保存新配置
        try {
            saveRecipeLoadConfig();
            debug('新配置已自动保存');
        } catch (saveErr) {
            warn('自动保存新配置失败: ' + saveErr.message);
        }
    } else if (totalPreserved > 0) {
        info('自动配方注册完成: 无新配方，保留了 ' + totalPreserved + ' 个现有配方的状态，跳过 ' + totalSkipped + ' 个无效配方');
    } else {
        debug('没有新配方需要注册（跳过 ' + totalSkipped + ' 个无效配方）');
    }
    
    return totalRegistered;
}

// 注意：自动配方注册功能已移至更合适的时机调用
// 原自动注册逻辑可能因配方数组未完全导出导致配置覆盖问题
// 建议在 ServerEvents.loaded 事件中调用，或通过管理员命令手动触发

// =====================================================
// =============== 配方修改API ==================
// =====================================================

/**
 * 修改配方
 * 
 * 通过ID查找配方并修改其属性。修改成功后会标记配方层缓存失效，
 * 并自动同步到 GTCEu 注册表，后续使用样板总成缓存/重放样板时会看到新值。
 * 
 * @param {string} id - 配方ID
 * @param {Object} modifications - 要修改的属性对象
 * @returns {Object|null} 修改后的配方对象，如果找不到配方则返回null
 */
function modifyRecipe(id, modifications) {
    // 查找配方
    var recipeResult = findRecipeById(id);
    if (!recipeResult) {
        error('找不到配方: ' + id);
        return null;
    }
    
    var recipe = recipeResult.recipe;
    var arrayName = recipeResult.arrayName;
    var index = recipeResult.index;
    
    // 验证修改对象
    if (!modifications || typeof modifications !== 'object') {
        error('修改参数必须是对象: ' + typeof modifications);
        return null;
    }
    
    info('正在修改配方: ' + id + ' [' + arrayName + '][' + index + ']');
    
    // 记录原始值用于日志
    var changes = [];
    
    // 应用修改
    for (var key in modifications) {
        if (modifications.hasOwnProperty(key)) {
            var oldValue = recipe[key];
            var newValue = modifications[key];
            
            // 特殊处理：对于数组，可以设置为null或空数组来清空
            if (newValue === null && Array.isArray(recipe[key])) {
                recipe[key] = [];
                changes.push(key + ': [数组清空]');
            } else {
                recipe[key] = newValue;
                changes.push(key + ': ' + JSON.stringify(oldValue) + ' → ' + JSON.stringify(newValue));
            }
        }
    }
    
    // 验证修改后的配方
    try {
        // 尝试获取gtr对象进行验证（如果可用）
        var gtr = null;
        if (typeof global !== 'undefined' && global.gtr) {
            gtr = global.gtr;
        }
        
        if (gtr) {
            var validation = validateRecipe(recipe, gtr);
            if (!validation.valid) {
                warn('配方修改后验证警告: ' + validation.error);
            }
        }
    } catch (err) {
        // 验证失败不影响修改
        debug('配方验证跳过: ' + err.message);
    }
    

    // 配方层缓存失效：样板总成缓存样板后，下一次配方层重放会重新应用该修改。
    if (typeof global !== 'undefined') {
        global.shanhaiRecipeLayerDirty = true;
        debug('配方层缓存已标记失效，等待样板总成重放时重新应用');
    }

    // 同步到 GTCEu 注册表：移除旧配方并用修改后的数据重建，确保样板总成下次查找时看到新值。
    if (global._shanhaiGTR && global._shanhaiGTR[recipe.type]) {
        try {
            var fullId = recipe.id;
            if (fullId.indexOf(':') === -1) fullId = 'dishanhai:' + fullId;
            var javaAPI = Java.loadClass('com.dishanhai.gt_shanhai.api.DShanhaiRecipeModifierAPI');
            if (typeof javaAPI.removeAndSync === 'function') {
                javaAPI.removeAndSync(recipe.type, fullId);
            }
            var m = global._shanhaiGTR[recipe.type](fullId);
            DShanhaiRecipeEngine.applyAll(m, recipe);
            m.save();
            debug('✅ 配方已同步到 GTCEu 注册表: ' + fullId);
        } catch (syncErr) {
            warn('⚠️ 配方同步到 GTCEu 注册表失败: ' + syncErr.message);
        }
    }
    info('配方修改完成: ' + id + ' - 修改了 ' + changes.length + ' 个属性: ' + changes.join(', '));
    
    // 返回修改后的配方
    return {
        recipe: recipe,
        arrayName: arrayName,
        index: index,
        changes: changes,
        modifiedAt: new Date().toLocaleString()
    };
}

/**
 * 更新配方字段
 * 
 * 更新配方的单个字段值。这是modifyRecipe的简化版本。
 * 
 * @param {string} id - 配方ID
 * @param {string} field - 要更新的字段名
 * @param {any} value - 新值
 * @returns {boolean} 是否成功更新
 */
function updateRecipeField(id, field, value) {
    // 支持Java字符串对象
    if (field === null || field === undefined) {
        error('字段名不能为null或undefined');
        return false;
    }
    
    // 将field转换为字符串（支持Java字符串对象）
    try {
        field = String(field);
    } catch (err) {
        error('字段名必须是字符串，转换失败: ' + err.message);
        return false;
    }
    
    // 检查字段名是否为空
    if (!field.trim()) {
        error('字段名不能为空字符串');
        return false;
    }
    
    var modifications = {};
    modifications[field] = value;
    
    var result = modifyRecipe(id, modifications);
    return result !== null;
}

/**
 * 验证配方修改
 * 
 * 验证配方修改是否有效。检查必需的字段和类型。
 * 
 * @param {string} id - 配方ID
 * @param {Object} modifications - 要修改的属性对象
 * @returns {Object} 验证结果 {valid: boolean, errors: Array, warnings: Array}
 */
function validateRecipeModification(id, modifications) {
    var result = {
        valid: true,
        errors: [],
        warnings: []
    };
    
    // 查找配方
    var recipeResult = findRecipeById(id);
    if (!recipeResult) {
        result.valid = false;
        result.errors.push('找不到配方: ' + id);
        return result;
    }
    
    var recipe = recipeResult.recipe;
    
    // 验证修改对象
    if (!modifications || typeof modifications !== 'object') {
        result.valid = false;
        result.errors.push('修改参数必须是对象，实际类型: ' + typeof modifications);
        return result;
    }
    
    // 检查每个修改字段
    for (var key in modifications) {
        if (modifications.hasOwnProperty(key)) {
            var newValue = modifications[key];
            
            // 检查关键字段的类型
            if (key === 'EUt' && newValue !== null && typeof newValue !== 'number') {
                result.errors.push('EUt必须是数字，实际类型: ' + typeof newValue);
            } else if (key === 'duration' && newValue !== null && typeof newValue !== 'number') {
                result.errors.push('duration必须是数字，实际类型: ' + typeof newValue);
            } else if (key === 'type' && (newValue === null || newValue === undefined || String(newValue).trim() === '')) {
                result.errors.push('type必须是有效的非空字符串，实际类型: ' + typeof newValue);
            } else if ((key === 'itemInputs' || key === 'itemOutputs') && newValue !== null && !Array.isArray(newValue)) {
                result.errors.push(key + '必须是数组，实际类型: ' + typeof newValue);
            } else if ((key === 'inputFluids' || key === 'outputFluids') && newValue !== null && !Array.isArray(newValue)) {
                result.errors.push(key + '必须是数组，实际类型: ' + typeof newValue);
            }
            
            // 检查机器类型是否有效（如果修改了type字段）
            if (key === 'type' && newValue !== null && newValue !== undefined && String(newValue).trim()) {
                try {
                    // 尝试获取gtr对象进行验证（如果可用）
                    var gtr = null;
                    if (typeof global !== 'undefined' && global.gtr) {
                        gtr = global.gtr;
                    }
                    
                    if (gtr && !gtr[newValue]) {
                        result.warnings.push('未知机器类型: ' + newValue + ' (在当前的gtr对象中未找到)');
                    }
                } catch (err) {
                    // 忽略验证错误
                }
            }
        }
    }
    
    result.valid = result.errors.length === 0;
    return result;
}

/**
 * 获取可修改的配方字段
 * 
 * 返回配方支持修改的字段列表及其类型信息。
 * 
 * @returns {Object} 字段信息对象
 */
function getModifiableFields() {
    return {
        // 基本字段
        id: { type: 'string', required: true, description: '配方ID（通常不建议修改）' },
        type: { type: 'string', required: true, description: '机器类型（如 assembler, centrifuge 等）' },
        
        // 输入输出
        itemInputs: { type: 'array', required: false, description: '物品输入数组（如 ["4x minecraft:iron_ingot"]）' },
        inputFluids: { type: 'array', required: false, description: '流体输入数组（如 ["minecraft:water 1000"]）' },
        itemOutputs: { type: 'array', required: false, description: '物品输出数组' },
        outputFluids: { type: 'array', required: false, description: '流体输出数组' },
        
        // 机器参数
        EUt: { type: 'number', required: false, description: '能量消耗（EU/t）' },
        duration: { type: 'number', required: true, description: '处理时间（tick）' },
        circuit: { type: 'number|string', required: false, description: '电路配置' },
        
        // 特殊字段
        notConsumable: { type: 'string|array', required: false, description: '非消耗品' },
        notConsumableFluid: { type: 'string|array', required: false, description: '非消耗流体' },
        blastFurnaceTemp: { type: 'number', required: false, description: '高炉温度' },
        
        // 研究配方字段
        stationResearch: { type: 'object', required: false, description: '研究站配置' },
        
        // 动态标记
        dynamicOutputs: { type: 'boolean', required: false, description: '动态输出标记' },
        triggerJsError: { type: 'boolean', required: false, description: '触发JS错误（测试用）' }
    };
}

/**
 * 获取配方信息
 * 
 * 获取配方的详细信息，包括输入、输出、机器参数等。
 * 
 * @param {string} id - 配方ID
 * @returns {Object} 配方信息对象
 */
function getRecipeInfo(id) {
    var recipeResult = findRecipeById(id);
    if (!recipeResult) {
        return { error: '找不到配方: ' + id };
    }
    
    var recipe = recipeResult.recipe;
    
    // 构建配方信息
    var info = {
        id: recipe.id,
        type: recipe.type,
        location: recipeResult.arrayName + '[' + recipeResult.index + ']',
        fields: {}
    };
    
    // 收集所有字段
    for (var key in recipe) {
        if (recipe.hasOwnProperty(key)) {
            var value = recipe[key];
            var type = typeof value;
            if (Array.isArray(value)) type = 'array';
            if (value === null) type = 'null';
            
            info.fields[key] = {
                type: type,
                value: value
            };
        }
    }
    
    return info;
}

// =====================================================
// =============== 玩家控制接口 ==================
// =====================================================

/**
 * 检查玩家是否为OP
 * 
 * @param {Object} player - 玩家对象
 * @returns {boolean} 是否为OP
 */
function isPlayerOp(player) {
    if (!player || typeof player !== 'object') return false;
    return player.op === true;
}

/**
 * 向玩家发送消息
 * 
 * @param {Object} player - 玩家对象
 * @param {string} message - 消息内容
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
 * 处理配方修改命令
 * 
 * 格式: /配方修改 <配方ID> <字段> <值>
 * 示例: /配方修改 my_recipe EUt 256
 * 
 * @param {Object} player - 玩家对象
 * @param {Array} args - 命令参数
 * @returns {boolean} 是否处理成功
 */
function handleModifyCommand(player, args) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    if (args.length < 3) {
        sendMessageToPlayer(player, '§e用法: /配方修改 <配方ID> <字段> <值>');
        sendMessageToPlayer(player, '§7示例: /配方修改 my_recipe EUt 256');
        sendMessageToPlayer(player, '§7示例: /配方修改 my_recipe duration 100');
        return false;
    }
    
    var recipeId = args[0];
    var field = args[1];
    var valueStr = args.slice(2).join(' ');
    
    // 尝试解析值
    var value;
    try {
        // 尝试解析为JSON
        value = JSON.parse(valueStr);
    } catch (e) {
        // 如果不是JSON，尝试作为字符串或数字
        if (valueStr === 'null') {
            value = null;
        } else if (valueStr === 'true') {
            value = true;
        } else if (valueStr === 'false') {
            value = false;
        } else if (!isNaN(valueStr) && valueStr.trim() !== '') {
            value = Number(valueStr);
        } else {
            value = valueStr;
        }
    }
    
    sendMessageToPlayer(player, '§a正在修改配方: §e' + recipeId);
    sendMessageToPlayer(player, '§7字段: §e' + field + ' §7新值: §e' + JSON.stringify(value));
    
    // 验证修改
    var modifications = {};
    modifications[field] = value;
    var validation = validateRecipeModification(recipeId, modifications);
    if (!validation.valid) {
        sendMessageToPlayer(player, '§c验证失败: ' + validation.errors.join(', '));
        return false;
    }
    
    if (validation.warnings.length > 0) {
        sendMessageToPlayer(player, '§6警告: ' + validation.warnings.join(', '));
    }
    
    // 执行修改
    var result = updateRecipeField(recipeId, field, value);
    
    if (result) {
        sendMessageToPlayer(player, '§a✅ 配方修改成功！');
        sendMessageToPlayer(player, '§7注意: 修改的是内存中的配方对象，可能需要重新加载游戏才能生效。');
    } else {
        sendMessageToPlayer(player, '§c❌ 配方修改失败！');
        sendMessageToPlayer(player, '§7可能原因: 配方不存在或修改参数无效。');
    }
    
    return result;
}

/**
 * 处理配方信息命令
 * 
 * 格式: /配方信息 <配方ID>
 * 
 * @param {Object} player - 玩家对象
 * @param {Array} args - 命令参数
 * @returns {boolean} 是否处理成功
 */
function handleInfoCommand(player, args) {
    debug('handleInfoCommand 被调用，args: ' + JSON.stringify(args));
    
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    if (!args || args.length < 1) {
        sendMessageToPlayer(player, '§e用法: /配方信息 <配方ID>');
        sendMessageToPlayer(player, '§7示例: /配方信息 my_recipe');
        return false;
    }
    
    // 确保参数是字符串（支持Java字符串对象）
    var recipeId = String(args[0]);
    debug('recipeId: ' + recipeId + ' (原始类型: ' + typeof args[0] + ' -> ' + typeof recipeId + ')');
    
    if (!recipeId || recipeId.trim() === '') {
        sendMessageToPlayer(player, '§c错误: 配方ID不能为空！');
        return false;
    }
    
    var info = getRecipeInfo(recipeId);
    
    if (info.error) {
        sendMessageToPlayer(player, '§c' + info.error);
        return false;
    }
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a配方信息: §e' + recipeId);
    sendMessageToPlayer(player, '§7类型: §e' + info.type);
    sendMessageToPlayer(player, '§7位置: §e' + info.location);
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    // 显示主要字段
    var mainFields = ['id', 'type', 'EUt', 'duration', 'circuit', 'itemInputs', 'itemOutputs', 'inputFluids', 'outputFluids'];
    for (var i = 0; i < mainFields.length; i++) {
        var field = mainFields[i];
        if (info.fields[field]) {
            var fieldInfo = info.fields[field];
            sendMessageToPlayer(player, '§7' + field + ': §e' + JSON.stringify(fieldInfo.value));
        }
    }
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    return true;
}

/**
 * 处理配方列表命令
 * 
 * 格式: /配方列表 [数组名]
 * 
 * @param {Object} player - 玩家对象
 * @param {Array} args - 命令参数
 * @returns {boolean} 是否处理成功
 */
function handleListCommand(player, args) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    var arrayName = args.length > 0 ? args[0] : null;
    var recipeArrays = [
        { name: 'assrecipes', array: global.assrecipes },
        { name: 'universalRecipes', array: global.universalRecipes },
        { name: 'suprecipes_1', array: global.suprecipes_1 },
        { name: 'recipes_voidfluxs', array: global.recipes_voidfluxs },
        { name: 'dishanhairecipes', array: global.dishanhairecipes },
        { name: 'recipes', array: global.recipes },
        { name: 'recipes_electrolyzers', array: global.recipes_electrolyzers }
    ];
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a可用配方数组列表');
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    var totalRecipes = 0;
    for (var i = 0; i < recipeArrays.length; i++) {
        var arr = recipeArrays[i];
        if (!arr.array) continue;
        
        if (arrayName && arr.name !== arrayName) continue;
        
        var count = arr.array.length;
        totalRecipes += count;
        sendMessageToPlayer(player, '§7' + arr.name + ': §e' + count + ' 个配方');
        
        // 如果指定了数组名，显示该数组的所有配方
        if (arrayName && arr.name === arrayName) {
            for (var j = 0; j < Math.min(count, 20); j++) { // 最多显示20个
                var recipe = arr.array[j];
                if (recipe && recipe.id) {
                    sendMessageToPlayer(player, '  §7' + j + ': §e' + recipe.id);
                }
            }
            if (count > 20) {
                sendMessageToPlayer(player, '  §7... 还有 ' + (count - 20) + ' 个配方未显示');
            }
        }
    }
    
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    sendMessageToPlayer(player, '§a总计: §e' + totalRecipes + ' 个配方');
    if (!arrayName) {
        sendMessageToPlayer(player, '§7使用 /配方列表 <数组名> 查看特定数组的配方');
    }
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    return true;
}

/**
 * 处理帮助命令
 * 
 * 格式: /配方帮助
 * 
 * @param {Object} player - 玩家对象
 * @returns {boolean} 是否处理成功
 */
function handleHelpCommand(player) {
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a山海私货 · 配方控制API');
    sendMessageToPlayer(player, '§7版本: v2.4.0 - 仅限OP玩家使用');
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    sendMessageToPlayer(player, '§e可用命令:');
    sendMessageToPlayer(player, '§7/配方修改 <配方ID> <字段> <值> §f- 修改配方字段');
    sendMessageToPlayer(player, '§7/配方信息 <配方ID> §f- 查看配方详细信息');
    sendMessageToPlayer(player, '§7/配方列表 [数组名] §f- 查看配方数组列表');
    sendMessageToPlayer(player, '§7/配方开关 <配方ID> <开/关> §f- 启用/禁用配方加载');
    sendMessageToPlayer(player, '§7/配方状态 <配方ID> §f- 查看配方加载状态');
    sendMessageToPlayer(player, '§7/配方列表已启用 §f- 列出所有启用的配方');
    sendMessageToPlayer(player, '§7/配方列表已禁用 §f- 列出所有禁用的配方');
    sendMessageToPlayer(player, '§7/配方重置配置 §f- 重置所有配置（需要确认）');
    sendMessageToPlayer(player, '§7/配方确认重置 §f- 确认重置配置操作');
    sendMessageToPlayer(player, '§7/配方诊断 §f- 诊断API状态和配置问题');
    sendMessageToPlayer(player, '§7/配方扫描注册 §f- 扫描配方数组并自动注册新配方');
    sendMessageToPlayer(player, '§7/配方帮助 §f- 显示此帮助信息');
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    sendMessageToPlayer(player, '§e常用字段:');
    sendMessageToPlayer(player, '§7EUt §f- 能量消耗 (数字)');
    sendMessageToPlayer(player, '§7duration §f- 处理时间 (数字)');
    sendMessageToPlayer(player, '§7itemInputs §f- 物品输入 (JSON数组)');
    sendMessageToPlayer(player, '§7itemOutputs §f- 物品输出 (JSON数组)');
    sendMessageToPlayer(player, '§7示例: /配方修改 my_recipe EUt 256');
    sendMessageToPlayer(player, '§7示例: /配方修改 my_recipe itemOutputs \'["2x minecraft:diamond"]\'');
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    return true;
}

/**
 * 处理配方开关命令
 * 
 * 格式: /配方开关 <配方ID> <开/关>
 * 示例: /配方开关 my_recipe 开
 * 示例: /配方开关 my_recipe 关闭
 * 
 * @param {Object} player - 玩家对象
 * @param {Array} args - 命令参数
 * @returns {boolean} 是否处理成功
 */
function handleRecipeSwitchCommand(player, args) {
    debug('handleRecipeSwitchCommand 被调用，args: ' + JSON.stringify(args));
    
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    if (!args || args.length < 2) {
        sendMessageToPlayer(player, '§e用法: /配方开关 <配方ID> <开/关>');
        sendMessageToPlayer(player, '§7示例: /配方开关 test_recipe_load_control 关');
        sendMessageToPlayer(player, '§7可用值: 开, 开启, 启用, true, 1, 关, 关闭, 禁用, false, 0');
        return false;
    }
    
    // 确保参数是字符串（支持Java字符串对象）
    var recipeId = String(args[0]);
    var switchValue = String(args[1]).toLowerCase();
    
    debug('recipeId: ' + recipeId + ' (类型: ' + typeof args[0] + ' -> ' + typeof recipeId + '), switchValue: ' + switchValue);
    
    if (!recipeId || recipeId.trim() === '') {
        sendMessageToPlayer(player, '§c错误: 配方ID不能为空！');
        return false;
    }
    
    // 解析开关值
    var enabled;
    if (['开', '开启', '启用', 'true', '1', 'on', 'enable'].includes(switchValue)) {
        enabled = true;
    } else if (['关', '关闭', '禁用', 'false', '0', 'off', 'disable'].includes(switchValue)) {
        enabled = false;
    } else {
        sendMessageToPlayer(player, '§c错误: 无效的开关值，请使用"开"或"关"');
        sendMessageToPlayer(player, '§7可用值: 开, 开启, 启用, true, 1, 关, 关闭, 禁用, false, 0');
        return false;
    }
    
    sendMessageToPlayer(player, '§a正在设置配方加载状态: §e' + recipeId);
    sendMessageToPlayer(player, '§7状态: §e' + (enabled ? '开启 (启用)' : '关闭 (禁用)'));
    
    debug('调用 setRecipeEnabled("' + recipeId + '", ' + enabled + ')');
    var result = setRecipeEnabled(recipeId, enabled);
    debug('setRecipeEnabled 返回: ' + result);
    
    if (result) {
        sendMessageToPlayer(player, '§a✅ 配方加载状态设置成功！');
        sendMessageToPlayer(player, '§7注意: 此设置控制配方是否应该加载，实际效果取决于脚本实现。');
    } else {
        sendMessageToPlayer(player, '§c❌ 配方加载状态设置失败！');
        sendMessageToPlayer(player, '§7可能原因: 配方ID无效或保存配置时出错。');
        sendMessageToPlayer(player, '§7请使用 /配方诊断 检查API状态');
    }
    
    return result;
}

/**
 * 处理配方数组开关命令
 * 
 * 格式: /配方数组开关 <数组名> <开/关>
 * 示例: /配方数组开关 assrecipes 关
 * 
 * @param {Object} player - 玩家对象
 * @param {Array} args - 命令参数
 * @returns {boolean} 是否处理成功
 */
function handleArraySwitchCommand(player, args) {
    debug('handleArraySwitchCommand 被调用，args: ' + JSON.stringify(args));
    
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    if (!args || args.length < 2) {
        sendMessageToPlayer(player, '§e用法: /配方数组开关 <数组名> <开/关>');
        sendMessageToPlayer(player, '§7示例: /配方数组开关 assrecipes 关');
        sendMessageToPlayer(player, '§7可用数组名: assrecipes, universalRecipes, suprecipes_1, dishanhairecipes, recipes, recipes_electrolyzers');
        sendMessageToPlayer(player, '§7可用值: 开, 开启, 启用, true, 1, 关, 关闭, 禁用, false, 0');
        return false;
    }
    
    // 确保参数是字符串（支持Java字符串对象）
    var arrayName = String(args[0]);
    var switchValue = String(args[1]).toLowerCase();
    
    debug('arrayName: ' + arrayName + ', switchValue: ' + switchValue);
    
    if (!arrayName || arrayName.trim() === '') {
        sendMessageToPlayer(player, '§c错误: 数组名称不能为空！');
        return false;
    }
    
    // 解析开关值
    var enabled;
    if (['开', '开启', '启用', 'true', '1', 'on', 'enable'].includes(switchValue)) {
        enabled = true;
    } else if (['关', '关闭', '禁用', 'false', '0', 'off', 'disable'].includes(switchValue)) {
        enabled = false;
    } else {
        sendMessageToPlayer(player, '§c错误: 无效的开关值，请使用"开"或"关"');
        sendMessageToPlayer(player, '§7可用值: 开, 开启, 启用, true, 1, 关, 关闭, 禁用, false, 0');
        return false;
    }
    
    sendMessageToPlayer(player, '§a正在设置数组加载状态: §e' + arrayName);
    sendMessageToPlayer(player, '§7状态: §e' + (enabled ? '开启 (启用)' : '关闭 (禁用)'));
    sendMessageToPlayer(player, '§7此操作将批量设置数组中所有配方的加载状态...');
    
    debug('调用 batchSetArrayEnabled("' + arrayName + '", ' + enabled + ')');
    var result = batchSetArrayEnabled(arrayName, enabled);
    debug('batchSetArrayEnabled 返回: ' + JSON.stringify(result));
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a数组加载状态设置完成: §e' + arrayName);
    sendMessageToPlayer(player, '§7数组中共有配方: §e' + result.recipeCount + ' 个');
    sendMessageToPlayer(player, '§7成功设置: §a' + result.success + ' 个');
    
    if (result.failed > 0) {
        sendMessageToPlayer(player, '§c设置失败: §e' + result.failed + ' 个');
        if (result.errors && result.errors.length > 0) {
            sendMessageToPlayer(player, '§7前3个错误:');
            for (var i = 0; i < Math.min(3, result.errors.length); i++) {
                sendMessageToPlayer(player, '§c  • ' + result.errors[i]);
            }
        }
    }
    
    sendMessageToPlayer(player, '§7注意: 此设置控制数组中所有配方是否应该加载，实际效果取决于脚本实现。');
    sendMessageToPlayer(player, '§7您仍可以单独设置每个配方的加载状态，覆盖此批量设置。');
    
    if (result.success > 0) {
        sendMessageToPlayer(player, '§a✅ 数组加载状态批量设置成功！');
        return true;
    } else {
        sendMessageToPlayer(player, '§c❌ 数组加载状态设置失败！');
        sendMessageToPlayer(player, '§7可能原因: 数组不存在、数组为空或内部错误。');
        sendMessageToPlayer(player, '§7请使用 /配方诊断 检查API状态');
        return false;
    }
}

/**
 * 处理配方状态命令
 * 
 * 格式: /配方信息 <配方ID>
 * 示例: /配方信息 my_recipe
 * 
 * @param {Object} player - 玩家对象
 * @param {Array} args - 命令参数
 * @returns {boolean} 是否处理成功
 */
function handleRecipeStatusCommand(player, args) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    if (args.length < 1) {
        sendMessageToPlayer(player, '§e用法: /配方状态 <配方ID>');
        sendMessageToPlayer(player, '§7示例: /配方状态 my_recipe');
        return false;
    }
    
    var recipeId = args[0];
    
    sendMessageToPlayer(player, '§a正在查询配方加载状态: §e' + recipeId);
    
    var configKey = findRecipeConfigKey(recipeId);
    var enabled = isRecipeEnabled(recipeId);
    var hasConfig = configKey !== null && recipeLoadConfig.hasOwnProperty(configKey);
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a配方加载状态: §e' + recipeId);
    sendMessageToPlayer(player, '§7当前状态: §e' + (enabled ? '开启 (启用)' : '关闭 (禁用)'));
    sendMessageToPlayer(player, '§7配置设置: §e' + (hasConfig ? '已配置' : '未配置 (使用默认值)'));
    
    if (hasConfig) {
        var configValue = recipeLoadConfig[configKey];
        sendMessageToPlayer(player, '§7配置键: §e' + configKey);
        sendMessageToPlayer(player, '§7配置值: §e' + (configValue ? 'true' : 'false'));
    } else {
        sendMessageToPlayer(player, '§7默认值: §etrue (所有配方默认启用)');
    }
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§7使用 §e/配方开关 ' + recipeId + ' ' + (enabled ? '关' : '开') + ' §7切换状态');
    
    return true;
}

/**
 * 处理已启用配方列表命令
 * 
 * 格式: /配方列表已启用
 * 
 * @param {Object} player - 玩家对象
 * @returns {boolean} 是否处理成功
 */
function handleEnabledListCommand(player) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    var enabledRecipes = getEnabledRecipes();
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a已启用的配方列表');
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    if (enabledRecipes.length === 0) {
        sendMessageToPlayer(player, '§7没有明确设置为启用的配方');
        sendMessageToPlayer(player, '§7注意: 所有配方默认启用，除非明确设置为禁用');
    } else {
        sendMessageToPlayer(player, '§7数量: §e' + enabledRecipes.length + ' 个配方');
        sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
        
        // 分组显示，每行最多3个
        for (var i = 0; i < enabledRecipes.length; i += 3) {
            var line = '';
            for (var j = 0; j < 3 && i + j < enabledRecipes.length; j++) {
                if (j > 0) line += ' §7| ';
                line += '§e' + enabledRecipes[i + j];
            }
            sendMessageToPlayer(player, line);
        }
    }
    
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    sendMessageToPlayer(player, '§7使用 §e/配方状态 <配方ID> §7查看详细状态');
    sendMessageToPlayer(player, '§7使用 §e/配方列表已禁用 §7查看禁用的配方列表');
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    
    return true;
}

/**
 * 处理已禁用配方列表命令
 * 
 * 格式: /配方列表已禁用
 * 
 * @param {Object} player - 玩家对象
 * @returns {boolean} 是否处理成功
 */
function handleDisabledListCommand(player) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    var disabledRecipes = getDisabledRecipes();
    
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    sendMessageToPlayer(player, '§a已禁用的配方列表');
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    
    if (disabledRecipes.length === 0) {
        sendMessageToPlayer(player, '§7没有明确设置为禁用的配方');
        sendMessageToPlayer(player, '§7注意: 所有配方默认启用');
    } else {
        sendMessageToPlayer(player, '§7数量: §e' + disabledRecipes.length + ' 个配方');
        sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
        
        // 分组显示，每行最多3个
        for (var i = 0; i < disabledRecipes.length; i += 3) {
            var line = '';
            for (var j = 0; j < 3 && i + j < disabledRecipes.length; j++) {
                if (j > 0) line += ' §7| ';
                line += '§e' + disabledRecipes[i + j];
            }
            sendMessageToPlayer(player, line);
        }
    }
    
    sendMessageToPlayer(player, '§6───────────────────────────────────────────────────────────');
    sendMessageToPlayer(player, '§7使用 §e/配方状态 <配方ID> §7查看详细状态');
    sendMessageToPlayer(player, '§7使用 §e/配方开关 <配方ID> 开 §7启用配方');
    sendMessageToPlayer(player, '§6═══════════════════════════════════════════════════════════');
    
    return true;
}

/**
 * 处理配方配置重置命令
 * 
 * 格式: /配方重置配置
 * 
 * @param {Object} player - 玩家对象
 * @returns {boolean} 是否处理成功
 */
function handleRecipeConfigResetCommand(player) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    var configCount = Object.keys(recipeLoadConfig).length;
    
    if (configCount === 0) {
        sendMessageToPlayer(player, '§e提示: 配方加载配置已经是空的，无需重置');
        return true;
    }
    
    sendMessageToPlayer(player, '§c⚠️ 警告: 即将重置配方加载配置！');
    sendMessageToPlayer(player, '§7这将清除所有 ' + configCount + ' 个配方的加载设置');
    sendMessageToPlayer(player, '§7所有配方将恢复为默认启用状态');
    sendMessageToPlayer(player, '§c此操作不可撤销！');
    sendMessageToPlayer(player, '§7输入 §e/配方确认重置 §7继续操作');
    
    // 设置确认标记
    global.shanhaiRecipeConfigResetPending = true;
    global.shanhaiRecipeConfigResetPlayer = player.username || player.name || '未知玩家';
    
    return true;
}

/**
 * 处理配方确认重置命令
 * 
 * 格式: /配方确认重置
 * 
 * @param {Object} player - 玩家对象
 * @returns {boolean} 是否处理成功
 */
function handleRecipeConfirmResetCommand(player) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    if (!global.shanhaiRecipeConfigResetPending) {
        sendMessageToPlayer(player, '§e提示: 没有待确认的配置重置操作');
        sendMessageToPlayer(player, '§7请先使用 §e/配方重置配置 §7命令');
        return false;
    }
    
    var pendingPlayer = global.shanhaiRecipeConfigResetPlayer;
    var currentPlayer = player.username || player.name || '未知玩家';
    
    if (pendingPlayer !== currentPlayer) {
        sendMessageToPlayer(player, '§c错误: 此重置操作由玩家 §e' + pendingPlayer + ' §c发起');
        sendMessageToPlayer(player, '§c只有发起者可以确认重置操作');
        return false;
    }
    
    var configCount = Object.keys(recipeLoadConfig).length;
    
    sendMessageToPlayer(player, '§a正在重置配方加载配置...');
    
    // 方案四：完全清空配置，不保留任何默认值
    // 同时设置重置标志，防止配置完整性检查从默认值文件恢复
    // 并禁用自动注册，防止自动注册覆盖重置操作
    if (typeof global !== 'undefined') {
        global.shanhaiRecipeConfigJustReset = true;
        global.AUTO_REGISTER_RECIPES = false;
    }
    
    // 完全清空配置
    recipeLoadConfig = {};
    
    // 保存空配置
    var saved = saveRecipeLoadConfig();
    
    // 清除确认标记
    global.shanhaiRecipeConfigResetPending = false;
    global.shanhaiRecipeConfigResetPlayer = null;
    
    if (saved) {
        sendMessageToPlayer(player, '§a✅ 所有配方配置已清空！');
        sendMessageToPlayer(player, '§7已清除 ' + configCount + ' 个配方的加载设置');
        sendMessageToPlayer(player, '§7所有配方将恢复默认行为');
    } else {
        sendMessageToPlayer(player, '§c❌ 配方加载配置清空失败！');
        sendMessageToPlayer(player, '§7可能原因: 保存配置时出错');
    }
    
    return saved;
}

/**
 * 处理配方诊断命令
 * 
 * 格式: /配方诊断
 * 
 * @param {Object} player - 玩家对象
 * @returns {boolean} 是否处理成功
 */
function handleRecipeDiagnosticCommand(player) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    sendMessageToPlayer(player, '§6=== 配方控制API诊断 ===');
    
    // 显示配置基本信息
    sendMessageToPlayer(player, '§7recipeLoadConfig条目数: §e' + Object.keys(recipeLoadConfig).length);
    
    var keys = Object.keys(recipeLoadConfig);
    if (keys.length > 0) {
        sendMessageToPlayer(player, '§7前10个配置的配方:');
        for (var i = 0; i < Math.min(keys.length, 10); i++) {
            var key = keys[i];
            var value = recipeLoadConfig[key];
            sendMessageToPlayer(player, '§7  ' + key + ' = ' + (value ? '§a启用' : '§c禁用'));
        }
    }
    
    // 检查全局存储
    sendMessageToPlayer(player, '§7global.shanhaiRecipeLoadConfig检查: ' + 
        (typeof global !== 'undefined' ? 
            (global.shanhaiRecipeLoadConfig ? '§a已定义' : '§c未定义') : 
            '§cglobal对象未定义'));
    
    if (typeof global !== 'undefined' && global.shanhaiRecipeLoadConfig) {
        var globalKeys = Object.keys(global.shanhaiRecipeLoadConfig);
        sendMessageToPlayer(player, '§7全局存储条目数: §e' + globalKeys.length);
    }
    
    // 检查 JsonIO API
    sendMessageToPlayer(player, '§7JsonIO API检查: ' + 
        (typeof JsonIO !== 'undefined' ? '§a可用' : '§c不可用'));
    
    // 检查配方数组导出
    sendMessageToPlayer(player, '§7配方数组导出检查: ' + 
        (typeof global !== 'undefined' && global.shanhaiRecipeArrays ? 
            '§a已导出 (' + Object.keys(global.shanhaiRecipeArrays).length + ' 个数组)' : 
            '§c未导出'));
    
    // 检查自动注册设置
    var autoRegisterEnabled = typeof global !== 'undefined' && global.AUTO_REGISTER_RECIPES !== false;
    sendMessageToPlayer(player, '§7自动配方注册: ' + (autoRegisterEnabled ? '§a启用' : '§c禁用'));
    
    // 测试保存功能
    sendMessageToPlayer(player, '§7正在测试保存功能...');
    var saveResult = saveRecipeLoadConfig();
    sendMessageToPlayer(player, '§7保存测试结果: ' + (saveResult ? '§a成功' : '§c失败'));
    
    // 如果配置为空，提供建议
    if (Object.keys(recipeLoadConfig).length === 0) {
        sendMessageToPlayer(player, '§6=== 配置为空提示 ===');
        sendMessageToPlayer(player, '§7当前没有配置任何配方，可能是以下原因:');
        sendMessageToPlayer(player, '§7  1. 首次运行，尚未配置任何配方');
        sendMessageToPlayer(player, '§7  2. 自动注册功能已禁用');
        sendMessageToPlayer(player, '§7  3. 配方数组尚未导出到全局对象');
        sendMessageToPlayer(player, '§7建议操作:');
        sendMessageToPlayer(player, '§7  - 使用 §e/配方列表 §7查看所有可用配方');
        sendMessageToPlayer(player, '§7  - 使用 §e/配方开关 <配方ID> 开/关 §7控制配方加载');
        if (global.shanhaiRecipeControlAPI) {
            sendMessageToPlayer(player, '§7  - 使用 §eglobal.shanhaiRecipeControlAPI.autoRegisterRecipesFromArrays() §7手动注册');
        }
    }
    
    // 诊断结果
    sendMessageToPlayer(player, '§6=== 诊断完成 ===');
    sendMessageToPlayer(player, '§7如果保存失败，请检查文件权限和磁盘空间');
    
    return true;
}

/**
 * 处理配方扫描注册命令
 * 
 * 格式: /配方扫描注册
 * 功能: 手动触发从配方数组自动注册配方到加载配置
 * 
 * @param {Object} player - 玩家对象
 * @returns {boolean} 是否处理成功
 */
function handleRecipeScanRegisterCommand(player) {
    if (!isPlayerOp(player)) {
        sendMessageToPlayer(player, '§c错误: 只有OP玩家可以使用此命令！');
        return false;
    }
    
    sendMessageToPlayer(player, '§6=== 配方扫描注册 ===');
    sendMessageToPlayer(player, '§7正在扫描配方数组并自动注册配方...');
    
    // 检查配方数组是否已导出
    if (typeof global === 'undefined' || !global.shanhaiRecipeArrays) {
        sendMessageToPlayer(player, '§c错误: 配方数组尚未导出到全局对象！');
        sendMessageToPlayer(player, '§7这可能是因为配方脚本尚未完全加载。');
        sendMessageToPlayer(player, '§7建议等待服务器完全启动后再执行此命令。');
        return false;
    }
    
    // 获取当前配置状态
    var beforeCount = Object.keys(recipeLoadConfig).length;
    sendMessageToPlayer(player, '§7当前配置条目数: §e' + beforeCount);
    sendMessageToPlayer(player, '§7配方数组数量: §e' + Object.keys(global.shanhaiRecipeArrays).length);
    
    // 执行自动注册
    try {
        var registeredCount = autoRegisterRecipesFromArrays(true); // force=true 强制重新扫描
        
        if (registeredCount > 0) {
            sendMessageToPlayer(player, '§a✅ 扫描注册完成！');
            sendMessageToPlayer(player, '§7新增注册: §e' + registeredCount + ' §7个配方');
            
            // 获取更新后的配置状态
            var afterCount = Object.keys(recipeLoadConfig).length;
            sendMessageToPlayer(player, '§7配置条目数变化: §e' + beforeCount + ' §7→ §a' + afterCount);
            
            // 尝试保存配置
            sendMessageToPlayer(player, '§7正在保存配置...');
            var saved = saveRecipeLoadConfig();
            if (saved) {
                sendMessageToPlayer(player, '§a✅ 配置已成功保存到文件');
            } else {
                sendMessageToPlayer(player, '§c⚠️ 配置保存失败，但内存中的配置已更新');
            }
        } else {
            sendMessageToPlayer(player, '§7扫描完成，未发现需要注册的新配方');
            sendMessageToPlayer(player, '§7当前配置已包含所有配方数组中的配方');
            
            // 检查是否有跳过或保留的配方
            // 这里可以添加更详细的统计信息
        }
        
        sendMessageToPlayer(player, '§6=== 扫描注册完成 ===');
        return true;
    } catch (err) {
        sendMessageToPlayer(player, '§c❌ 扫描注册过程中出错！');
        sendMessageToPlayer(player, '§7错误信息: §c' + err.message);
        error('配方扫描注册失败: ' + err.message);
        return false;
    }
}

// =====================================================
// =============== 聊天命令注册 ==================
// =====================================================

ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands;
    var Arguments = event.arguments;
    
    // 注册 /配方修改 命令
    event.register( 
        Commands.literal('配方修改')
            .requires(function(source) {
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
                        handleModifyCommand(player, args);
                    } else {
                        // 控制台执行
                        console.log('控制台执行配方修改: ' + argsStr);
                        if (args.length >= 3) {
                            var result = updateRecipeField(args[0], args[1], args[2]);
                            console.log('结果: ' + (result ? '成功' : '失败'));
                        }
                    }
                    return 1;
                })
            )
    );
    
    // 注册 /配方数组开关 命令
    event.register(
        Commands.literal('配方数组开关')
            .requires(function(source) {
                if (source.getEntity && source.getEntity()) {
                    var player = source.getEntity();
                    return isPlayerOp(player);
                }
                return source.hasPermission(2);
            })
            .then(Commands.argument('args', Arguments.GREEDY_STRING.create(event))
                .executes(function(ctx) {
                    var source = ctx.source;
                    var player = source.getEntity ? source.getEntity() : null;
                    var argsStr = Arguments.GREEDY_STRING.getResult(ctx, 'args');
                    var args = argsStr ? argsStr.split(' ') : [];
                    
                    if (player) {
                        handleArraySwitchCommand(player, args);
                    } else {
                        // 控制台执行
                        console.log('控制台执行配方数组开关: ' + argsStr);
                        if (args.length >= 2) {
                            var arrayName = args[0];
                            var switchValue = args[1].toLowerCase();
                            var enabled = ['开', '开启', '启用', 'true', '1', 'on', 'enable'].includes(switchValue);
                            var result = batchSetArrayEnabled(arrayName, enabled);
                            console.log('结果: 成功 ' + result.success + ' 个，失败 ' + result.failed + ' 个');
                        }
                    }
                    return 1;
                })
            )
    );
    
    // 注册 /配方信息 命令
    event.register(
        Commands.literal('配方信息')
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
                        handleInfoCommand(player, [recipeId]);
                    } else {
                        var info = getRecipeInfo(recipeId);
                        console.log('配方信息: ' + JSON.stringify(info, null, 2));
                    }
                    return 1;
                })
            )
    );
    
    // 注册 /配方列表 命令
    event.register(
        Commands.literal('配方列表')
            .requires(function(source) {
                if (source.getEntity && source.getEntity()) {
                    var player = source.getEntity();
                    return isPlayerOp(player);
                }
                return source.hasPermission(2);
            })
            // 无参数分支（必须放在有参数分支之前）
            .executes(function(ctx) {
                var source = ctx.source;
                var player = source.getEntity ? source.getEntity() : null;
                
                if (player) {
                    handleListCommand(player, []);  // 无参数时传空数组
                } else {
                    console.log('配方数组列表:');
                    var recipeArrays = ['assrecipes', 'universalRecipes', 'suprecipes_1', 'recipes_voidfluxs', 'dishanhairecipes', 'recipes', 'recipes_electrolyzers'];
                    for (var i = 0; i < recipeArrays.length; i++) {
                        var arr = global[recipeArrays[i]];
                        if (arr) console.log(recipeArrays[i] + ': ' + arr.length + ' 个配方');
                    }
                }
                return 1;
            })
            // 有参数分支
            .then(Commands.argument('array', Arguments.GREEDY_STRING.create(event))
                .executes(function(ctx) {
                    var source = ctx.source;
                    var player = source.getEntity ? source.getEntity() : null;
                    var arrayName = Arguments.GREEDY_STRING.getResult(ctx, 'array');
                    
                    if (player) {
                        handleListCommand(player, arrayName ? [arrayName] : []);
                    } else {
                        console.log('配方数组列表:');
                        var recipeArrays = ['assrecipes', 'universalRecipes', 'suprecipes_1', 'recipes_voidfluxs', 'dishanhairecipes', 'recipes', 'recipes_electrolyzers'];
                        for (var i = 0; i < recipeArrays.length; i++) {
                            var arr = global[recipeArrays[i]];
                            if (arr) console.log(recipeArrays[i] + ': ' + arr.length + ' 个配方');
                        }
                    }
                    return 1;
                })
            )
    );
    
    // 注册 /配方帮助 命令
    event.register(
        Commands.literal('配方帮助')
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
                    console.log('配方控制API帮助 - 可用命令: /配方修改, /配方信息, /配方列表, /配方帮助');
                }
                return 1;
            })
    );
    
    // 注册 /配方开关 命令
    event.register(
        Commands.literal('配方开关')
            .requires(function(source) {
                if (source.getEntity && source.getEntity()) {
                    var player = source.getEntity();
                    return isPlayerOp(player);
                }
                return source.hasPermission(2);
            })
            .then(Commands.argument('args', Arguments.GREEDY_STRING.create(event))
                .executes(function(ctx) {
                    var source = ctx.source;
                    var player = source.getEntity ? source.getEntity() : null;
                    var argsStr = Arguments.GREEDY_STRING.getResult(ctx, 'args');
                    var args = argsStr ? argsStr.split(' ') : [];
                    
                    // 确保 args 是 JavaScript 数组（支持 Java 数组）
                    if (args && typeof args === 'object' && !Array.isArray(args)) {
                        try {
                            var jsArgs = [];
                            for (var i = 0; i < args.length; i++) {
                                jsArgs.push(String(args[i]));
                            }
                            args = jsArgs;
                            debug('已将Java数组转换为JavaScript数组，长度: ' + args.length);
                        } catch (err) {
                            debug('转换Java数组失败: ' + err.message);
                        }
                    }
                    
                    debug('配方开关命令执行，argsStr: "' + argsStr + '", args: ' + JSON.stringify(args));
                    
                    if (player) {
                        handleRecipeSwitchCommand(player, args);
                    } else {
                        console.log('控制台执行配方开关: ' + argsStr);
                        if (args.length >= 2) {
                            var enabled;
                            var switchValue = String(args[1]).toLowerCase();
                            if (['开', '开启', '启用', 'true', '1', 'on', 'enable'].includes(switchValue)) {
                                enabled = true;
                            } else if (['关', '关闭', '禁用', 'false', '0', 'off', 'disable'].includes(switchValue)) {
                                enabled = false;
                            } else {
                                console.log('错误: 无效的开关值');
                                return 1;
                            }
                            var result = setRecipeEnabled(String(args[0]), enabled);
                            console.log('结果: ' + (result ? '成功' : '失败'));
                        }
                    }
                    return 1;
                })
            )
    );
    
    // 注册 /配方状态 命令
    event.register(
        Commands.literal('配方状态')
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
                        handleRecipeStatusCommand(player, [recipeId]);
                    } else {
                        var enabled = isRecipeEnabled(recipeId);
                        console.log('配方状态: ' + recipeId + ' = ' + (enabled ? '启用' : '禁用'));
                    }
                    return 1;
                })
            )
    );
    
    // 注册 /配方列表已启用 命令
    event.register(
        Commands.literal('配方列表已启用')
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
                    handleEnabledListCommand(player);
                } else {
                    var enabledRecipes = getEnabledRecipes();
                    console.log('已启用的配方列表: ' + enabledRecipes.length + ' 个');
                    enabledRecipes.forEach(function(recipeId, index) {
                        console.log('  ' + index + ': ' + recipeId);
                    });
                }
                return 1;
            })
    );
    
    // 注册 /配方列表已禁用 命令
    event.register(
        Commands.literal('配方列表已禁用')
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
                    handleDisabledListCommand(player);
                } else {
                    var disabledRecipes = getDisabledRecipes();
                    console.log('已禁用的配方列表: ' + disabledRecipes.length + ' 个');
                    disabledRecipes.forEach(function(recipeId, index) {
                        console.log('  ' + index + ': ' + recipeId);
                    });
                }
                return 1;
            })
    );
    
    // 注册 /配方重置配置 命令
    event.register(
        Commands.literal('配方重置配置')
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
                    handleRecipeConfigResetCommand(player);
                } else {
                    console.log('控制台执行配方配置重置');
                    var configCount = Object.keys(recipeLoadConfig).length;
                    if (configCount > 0) {
                        console.log('警告: 将清除 ' + configCount + ' 个配方的加载设置');
                        console.log('输入确认命令继续...');
                    } else {
                        console.log('提示: 配方加载配置已经是空的');
                    }
                }
                return 1;
            })
    );
    
    // 注册 /配方确认重置 命令
    event.register(
        Commands.literal('配方确认重置')
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
                    handleRecipeConfirmResetCommand(player);
                } else {
                    console.log('控制台执行配方确认重置');
                    if (global.shanhaiRecipeConfigResetPending) {
                        var result = resetRecipeLoadConfig();
                        global.shanhaiRecipeConfigResetPending = false;
                        console.log('结果: ' + (result ? '成功' : '失败'));
                    } else {
                        console.log('错误: 没有待确认的配置重置操作');
                    }
                }
                return 1;
            })
    );
    
    // 注册 /配方诊断 命令
    event.register(
        Commands.literal('配方诊断')
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
                    handleRecipeDiagnosticCommand(player);
                } else {
                    console.log('控制台执行配方诊断');
                    console.log('recipeLoadConfig条目数: ' + Object.keys(recipeLoadConfig).length);
                    console.log('global.shanhaiRecipeLoadConfig检查: ' + 
                        (typeof global !== 'undefined' ? 
                            (global.shanhaiRecipeLoadConfig ? '已定义' : '未定义') : 
                            'global对象未定义'));
                    console.log('JsonIO API检查: ' + (typeof JsonIO !== 'undefined' ? '可用' : '不可用'));
                }
                return 1;
            })
    );
    
    // 注册 /配方扫描注册 命令
    event.register(
        Commands.literal('配方扫描注册')
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
                    handleRecipeScanRegisterCommand(player);
                } else {
                    console.log('控制台执行配方扫描注册');
                    console.log('正在扫描配方数组并自动注册配方...');
                    
                    // 检查配方数组是否已导出
                    if (typeof global === 'undefined' || !global.shanhaiRecipeArrays) {
                        console.log('错误: 配方数组尚未导出到全局对象！');
                        console.log('这可能是因为配方脚本尚未完全加载。');
                        return 1;
                    }
                    
                    // 获取当前配置状态
                    var beforeCount = Object.keys(recipeLoadConfig).length;
                    console.log('当前配置条目数: ' + beforeCount);
                    console.log('配方数组数量: ' + Object.keys(global.shanhaiRecipeArrays).length);
                    
                    // 执行自动注册
                    try {
                        var registeredCount = autoRegisterRecipesFromArrays(true); // force=true 强制重新扫描
                        
                        if (registeredCount > 0) {
                            console.log('✅ 扫描注册完成！');
                            console.log('新增注册: ' + registeredCount + ' 个配方');
                            
                            // 获取更新后的配置状态
                            var afterCount = Object.keys(recipeLoadConfig).length;
                            console.log('配置条目数变化: ' + beforeCount + ' → ' + afterCount);
                            
                            // 尝试保存配置
                            console.log('正在保存配置...');
                            var saved = saveRecipeLoadConfig();
                            if (saved) {
                                console.log('✅ 配置已成功保存到文件');
                            } else {
                                console.log('⚠️ 配置保存失败，但内存中的配置已更新');
                            }
                        } else {
                            console.log('扫描完成，未发现需要注册的新配方');
                            console.log('当前配置已包含所有配方数组中的配方');
                        }
                        
                        console.log('=== 扫描注册完成 ===');
                    } catch (err) {
                        console.log('❌ 扫描注册过程中出错！');
                        console.log('错误信息: ' + err.message);
                        error('配方扫描注册失败: ' + err.message);
                    }
                }
                return 1;
            })
    );
    
    info('配方控制API聊天命令已注册（包含配方加载控制命令）');
});

// =====================================================
// =============== 全局API导出 ==================
// =====================================================

// 导出到全局命名空间，供其他脚本使用
// 首先创建原始API对象
var rawAPI = {
    // 核心函数
    findRecipeById: findRecipeById,
    modifyRecipe: modifyRecipe,
    updateRecipeField: updateRecipeField,
    validateRecipeModification: validateRecipeModification,
    getModifiableFields: getModifiableFields,
    getRecipeInfo: getRecipeInfo,
    
    // 工具函数
    isPlayerOp: isPlayerOp,
    sendMessageToPlayer: sendMessageToPlayer,
    
    // 命令处理函数
    handleModifyCommand: handleModifyCommand,
    handleInfoCommand: handleInfoCommand,
    handleListCommand: handleListCommand,
    handleHelpCommand: handleHelpCommand,
    handleRecipeSwitchCommand: handleRecipeSwitchCommand,
    handleRecipeStatusCommand: handleRecipeStatusCommand,
    handleEnabledListCommand: handleEnabledListCommand,
    handleDisabledListCommand: handleDisabledListCommand,
    handleRecipeConfigResetCommand: handleRecipeConfigResetCommand,
    handleRecipeConfirmResetCommand: handleRecipeConfirmResetCommand,
    handleRecipeDiagnosticCommand: handleRecipeDiagnosticCommand,
    handleRecipeScanRegisterCommand: handleRecipeScanRegisterCommand,
    
    // 配方加载控制函数
    isRecipeEnabled: isRecipeEnabled,
    setRecipeEnabled: setRecipeEnabled,
    batchSetRecipeEnabled: batchSetRecipeEnabled,
    getAllRecipeLoadConfig: getAllRecipeLoadConfig,
    getEnabledRecipes: getEnabledRecipes,
    getDisabledRecipes: getDisabledRecipes,
    resetRecipeLoadConfig: resetRecipeLoadConfig,
    importRecipeLoadConfig: importRecipeLoadConfig,
    exportRecipeLoadConfig: exportRecipeLoadConfig,
    exportRecipeArrays: exportRecipeArrays,
    autoRegisterRecipesFromArrays: autoRegisterRecipesFromArrays,
    reloadRecipeLoadConfig: reloadRecipeLoadConfig,
    
    // 配置访问（高级）
    recipeLoadConfig: function() { return getAllRecipeLoadConfig(); },
    
    // 获取API版本号
    getVersion: function() {
        return '2.7.0';
    }
};

// 使用错误保护包装器保护所有API函数
info('正在为全局API添加错误保护...');
global.shanhaiRecipeControlAPI = protectAllAPIFunctions(rawAPI);
info('全局API错误保护已启用，共保护 ' + Object.keys(rawAPI).length + ' 个函数');

// =====================================================
// =============== 延迟自动配方注册 ==================
// =====================================================
// 在ServerEvents.loaded事件中检查配置状态，仅在配置为空时自动注册
// 防止覆盖手动重置的配置
ServerEvents.loaded(function(event) {
    // 检查是否启用自动注册（局部开关和全局开关）
    // 如果任一开关为false，则禁用自动注册
    var autoRegisterEnabled = AUTO_REGISTER_RECIPES !== false && 
        (typeof global !== 'undefined' && global.AUTO_REGISTER_RECIPES !== false);
    if (!autoRegisterEnabled) {
        debug('自动配方注册已被禁用（局部开关: ' + AUTO_REGISTER_RECIPES + ', 全局开关: ' + 
            (typeof global !== 'undefined' ? global.AUTO_REGISTER_RECIPES : 'undefined') + '）');
        return;
    }
    
    // 检查配置是否为空
    var config = getAllRecipeLoadConfig();
    var configKeys = Object.keys(config);
    
    if (configKeys.length === 0) {
        debug('配方配置为空，执行自动配方注册...');
        autoRegisterRecipesFromArrays();
    } else {
        debug('配方配置已存在 (' + configKeys.length + ' 个条目)，跳过自动注册');
        debug('如需重新注册所有配方，请使用命令 "/配方扫描注册"');
    }
});

// =====================================================
// =============== 初始化日志 ==================
// =====================================================



info('§6═══════════════════════════════════════════════════════════');

info('§a✨ 山海私货 · 配方控制API 加载完成！');
info('§6═══════════════════════════════════════════════════════════');
info('§b📋 配方控制API已就绪');
info('§7新增功能: §e配方加载控制§7 - 允许单独配置配方是否加载');
info('§7新增功能: §e配方数组导出§7 - 导出所有配方数组到全局对象');
info('§7新增功能: §e自动配方注册§7 - 自动发现并注册所有可用配方');
info('§7聊天命令: §e/配方修改§7, §e/配方信息§7, §e/配方列表§7, §e/配方开关§7, §e/配方状态§7, §e/配方列表已启用§7, §e/配方列表已禁用§7, §e/配方诊断§7, §e/配方扫描注册§7, §e/配方帮助 (也支持 ! 前缀)');
info('§7全局API: §eglobal.shanhaiRecipeControlAPI');
info('§7权限要求: §c仅限OP玩家使用');
info('§6═══════════════════════════════════════════════════════════');



})();
