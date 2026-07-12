// priority:70
//API主控制器模块 
// ========== 山海私货（日志模块） - 完整修复版 ==========

// ——— 目录：保护层 | 核心框架 | API | 配方 | AE包 ———

(function() {
//iife就绪
// 版本: 2.6 - API控制系统

// ==================== 山海私货 · 基础保护层 ====================
(function() {
    'use strict';

    // 环境检测
    console.log('§6[山海保护层] §a环境检测通过§r');

    // ==================== API冻结与保护 ====================
    function deepFreeze(obj, visited) {
        // 替换WeakSet为数组
        if (!visited) visited = [];
        if (obj === null || typeof obj !== 'object') return obj;
        if (visited.indexOf(obj) !== -1) return obj;
        visited.push(obj);
        
        var propNames = Object.getOwnPropertyNames(obj);
        for (var i = 0; i < propNames.length; i++) {
            var name = propNames[i];
            // 跳过以_开头的内部属性，允许它们保持可变状态
            if (name.charAt(0) === '_') continue;
            // 跳过需要保持可变的功能对象
            // 不再需要跳过已删除的保护层属性
            var value = obj[name];
            if (value && typeof value === 'object') {
                deepFreeze(value, visited);
            }
        }
        return Object.freeze(obj);
    }
    
    function sealAPI(apiObj, apiName) {
        // 设置不可删除、不可重写属性
        try {
            Object.defineProperty(global, apiName, {
                value: apiObj,
                writable: false,
                configurable: false,
                enumerable: true
            });
        } catch (e) {
            // 如果defineProperty失败，至少将API设置为只读属性-
            global[apiName] = apiObj;
            console.log('§6[山海保护层] §e警告: ' + apiName + ' 使用备用保护方案§r');
        }
        
        // 深度冻结API对象
        deepFreeze(apiObj);
        
    }
    
    // ==================== 导出基础防护API ====================
    var ShanhaiGuard = {
        sealAPI: sealAPI,
        deepFreeze: deepFreeze
    };

    deepFreeze(ShanhaiGuard);
    global.__shanhai_guard__ = ShanhaiGuard;
    global.__shanhai_version__ = '2.8.0';

    console.log('§6[山海保护层] §a基础防护层已加载§r');
})();
// ==================== 基础保护层结束 ====================

var Version = '2.7.8(日志系统版本2.7.3)'//主版本与日志系统版本
var API_Version = '2.9.1'//api版本
// 挂载到全局对象，供其他脚本访问
if (typeof global !== 'undefined') {
    global.shanhaiVersion = Version;
    global.shanhaiAPIVersion = API_Version;
}

//var superAEPackItemList = null; 超级AE包物品列表

//  配方去重检测（Rhino 兼容对象表，比 Set 更稳）
var _registeredCellRecipes = {};

function hasRegisteredCellRecipe(recipeId) {
    return _registeredCellRecipes[recipeId] === true;
}

function registerCellRecipe(recipeId) {
    _registeredCellRecipes[recipeId] = true;
}

var DShanhaiNBTAPIClass = null;
function getDShanhaiNBTAPI() {
    if (DShanhaiNBTAPIClass === null) {
        DShanhaiNBTAPIClass = Java.loadClass('com.dishanhai.gt_shanhai.api.DShanhaiNBTAPI');
    }
    return DShanhaiNBTAPIClass;
}

// ========== 全局配置初始化 ==========
if (typeof global !== 'undefined') {
    if (global.shanhaiRecipeLoadConfig === undefined) {
        global.shanhaiRecipeLoadConfig = {};
    }
    if (global.shanhaiRecipeInfoCollector === undefined) {
        global.shanhaiRecipeInfoCollector = {};
    }
}

// =====================================================
// =============== 山海私货 · 核心框架 ==================
// =====================================================

// ---------------- 日志模块 ----------------
var LOG_PREFIX = '§b[山海私货]§r';
var LOG_LEVEL = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
let currentLogLevel = LOG_LEVEL.INFO;

function getTimestamp() {
    var now = new Date();
    return '§7[' + now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0') + ']§r';
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

var debug = function(m) { return log(LOG_LEVEL.DEBUG, m); };
var info  = function(m) { return log(LOG_LEVEL.INFO, m); };
var warn  = function(m) { return log(LOG_LEVEL.WARN, m); };
var error = function(m) { return log(LOG_LEVEL.ERROR, m); };

// ---------------- Timer ----------------
function Timer(name){
    this.name=name;
    this.start=Date.now();
}
Timer.prototype.end=function(){
    var ms=(Date.now()-this.start).toFixed(2);
    info('⏱️ ' + this.name + ' 耗时: ' + ms + 'ms');
    return ms;
};

// ---------------- 配方错误消息发送 ----------------
function broadcastRecipeError(type, id, errorMsg) {
    console.error(`§c[配方错误] §7${type}: §c${id} - §e${errorMsg}`);
    try {
        if (typeof Server !== 'undefined' && Server.players && Server.players.length > 0) {
            var msg = `§c[配方错误] §7${type}: §c${id} - §e${errorMsg}`;
            for (var i = 0; i < Server.players.length; i++) {
                if (Server.players[i] && Server.players[i].op) {
                    Server.players[i].tell(msg);
                }
            }
        }
    } catch (err) {}
}

// =====================================================
// =============== API保护模块 ==================
// =====================================================

// ---------------- 输入验证 ----------------
function validateString(param, paramName, minLength, maxLength) {
    if (typeof param !== 'string') {
        throw new Error(`参数 ${paramName} 必须是字符串类型，实际类型: ${typeof param}`);
    }
    if (minLength !== undefined && param.length < minLength) {
        throw new Error(`参数 ${paramName} 长度不能小于 ${minLength}，实际长度: ${param.length}`);
    }
    if (maxLength !== undefined && param.length > maxLength) {
        throw new Error(`参数 ${paramName} 长度不能大于 ${maxLength}，实际长度: ${param.length}`);
    }
    return param;
}

function validateBoolean(param, paramName) {
    if (typeof param !== 'boolean') {
        throw new Error(`参数 ${paramName} 必须是布尔类型，实际类型: ${typeof param}`);
    }
    return param;
}

function validateNumber(param, paramName, min, max) {
    if (typeof param !== 'number' || isNaN(param)) {
        throw new Error(`参数 ${paramName} 必须是有效数字，实际类型: ${typeof param}`);
    }
    if (min !== undefined && param < min) {
        throw new Error(`参数 ${paramName} 不能小于 ${min}，实际值: ${param}`);
    }
    if (max !== undefined && param > max) {
        throw new Error(`参数 ${paramName} 不能大于 ${max}，实际值: ${param}`);
    }
    return param;
}

function validateObject(param, paramName, requiredKeys) {
    if (typeof param !== 'object' || param === null) {
        throw new Error(`参数 ${paramName} 必须是对象，实际类型: ${typeof param}`);
    }
    if (requiredKeys) {
        for (let i = 0; i < requiredKeys.length; i++) {
            let key = requiredKeys[i];
            if (!(key in param)) {
                throw new Error(`参数 ${paramName} 必须包含属性: ${key}`);
            }
        }
    }
    return param;
}

// ---------------- API防护装饰器 ----------------
function protectAPI(apiFunction, paramValidators, options) {
    options = options || {};
    var defaultOptions = {
        requireOp: false,
        maxCallPerSecond: 100,
        logPerformance: false
    };
    for (var key in defaultOptions) {
        if (options[key] === undefined) {
            options[key] = defaultOptions[key];
        }
    }
    
    var callCount = 0;
    var lastReset = Date.now();
    
    return function protectedFunction() {
        try {
            // 检查调用频率限制
            var now = Date.now();
            if (now - lastReset > 1000) { // 1秒重置
                callCount = 0;
                lastReset = now;
            }
            callCount++;
            if (callCount > options.maxCallPerSecond) {
                error(`API调用频率过高: ${apiFunction.name || '匿名函数'}，当前 ${callCount}/秒，限制 ${options.maxCallPerSecond}/秒`);
                throw new Error('API调用频率过高，请稍后重试');
            }
            
            // 验证参数
            var args = Array.prototype.slice.call(arguments);
            if (paramValidators) {
                for (var i = 0; i < paramValidators.length; i++) {
                    var validator = paramValidators[i];
                    if (validator) {
                        args[i] = validator(args[i], '参数' + (i + 1));
                    }
                }
            }
            
            // 权限检查
            if (options.requireOp && typeof Server !== 'undefined') {
                var hasOp = false;
                var players = Server.players;
                if (players && players.length > 0) {
                    for (var j = 0; j < players.length; j++) {
                        if (players[j] && players[j].op) {
                            hasOp = true;
                            break;
                        }
                    }
                }
                if (!hasOp) {
                    throw new Error('此API需要OP权限才能访问');
                }
            }
            
            // 执行原始函数
            var startTime = options.logPerformance ? Date.now() : 0;
            var result = apiFunction.apply(this, args);
            
            // 性能日志
            if (options.logPerformance) {
                var endTime = Date.now();
                debug(`API ${apiFunction.name || '匿名函数'} 执行时间: ${endTime - startTime}ms`);
            }
            
            return result;
            
        } catch (err) {
            // 错误处理
            error(`API调用失败: ${apiFunction.name || '匿名函数'} - ${err.message}`);
            
            // 如果是验证错误或权限错误，直接抛出
            if (err.message.includes('参数') || err.message.includes('权限') || err.message.includes('频率')) {
                throw err;
            }
            
            // 其他错误返回安全值
            if (options.defaultValue !== undefined) {
                warn(`API ${apiFunction.name || '匿名函数'} 出错，返回默认值: ${options.defaultValue}`);
                return options.defaultValue;
            }
            
            // 如果没有默认值，重新抛出错误
            throw err;
        }
    };
}

// ---------------- 全局变量保护 ----------------
function protectGlobalVariable(varName, defaultValue, options) {
    options = options || {};
    if (global[varName] === undefined) {
        global[varName] = defaultValue;
    }
    
    var originalValue = global[varName];
    
    if (typeof originalValue === 'object' && originalValue !== null) {
        // 对象保护：防止直接修改
        if (options.preventModification) {
            Object.freeze(originalValue);
        }
    }
    
    info(`全局变量 ${varName} 已启用保护`);
}

// ---------------- 初始化保护 ----------------
function initializeProtection() {
    info('初始化API保护系统...');

    // 保护关键全局变量
    protectGlobalVariable('shanhaiRecipeStats', {}, { preventModification: true });
    protectGlobalVariable('shanhaiAPI', {}, { preventModification: false });
    protectGlobalVariable('shanhaiRecipeAPI', {}, { preventModification: false });

    // 保护内部统计变量（注意：JS侧统计已废弃，配方统计已迁移到Java侧DShanhaiRecipeEngine）
    // 为保持兼容性，仍然保护这些变量，但不再检查数据就绪状态
    protectGlobalVariable('recipeStatsInternal', recipeStats, { preventModification: true });
    protectGlobalVariable('typeFailedInternal', typeFailed, { preventModification: true });

    info('API保护系统初始化完成');
}



// ---------------- 配方统计模块 ----------------
let recipeStats = {
    total:0, success:0, failed:0, disabled:0,
    byType:{}, errors:[]
};

let typeFailed = 0;

function recordRecipe(type, ok, id, msg){
    try { DShanhaiRecipeEngine.recordRecipe(type, ok, id, msg || ''); } catch (ignored) {}
    recipeStats.total++;
    if(!recipeStats.byType[type]) recipeStats.byType[type]={total:0,success:0,failed:0};
    recipeStats.byType[type].total++;

    if(ok){
        recipeStats.success++;
        recipeStats.byType[type].success++;
        debug(`✓ ${type}: ${id}`);
    } else {
        recipeStats.failed++;
        recipeStats.byType[type].failed++;
        recipeStats.errors.push({type:type,name:id,error:msg});
        error(`✗ ${type}: ${id} - ${msg}`);
    }
}

function cloneTypeStats(stats) {
    if (!stats) return null;
    return {
        total: stats.total || 0,
        success: stats.success || 0,
        failed: stats.failed || 0
    };
}

function cloneAllTypeStats(source) {
    var result = {};
    if (!source) return result;
    for (var type in source) {
        if (source.hasOwnProperty(type)) {
            result[type] = cloneTypeStats(source[type]);
        }
    }
    return result;
}

function cloneRecipeErrors(errors) {
    var result = [];
    if (!errors) return result;
    for (var i = 0; i < errors.length; i++) {
        var err = errors[i];
        result.push({ type: err.type, name: err.name, error: err.error });
    }
    return result;
}

function cloneRecipeStats() {
    return {
        total: recipeStats.total,
        success: recipeStats.success,
        failed: recipeStats.failed,
        disabled: recipeStats.disabled || 0,
        byType: cloneAllTypeStats(recipeStats.byType),
        errors: cloneRecipeErrors(recipeStats.errors)
    };
}

// =====================================================
// =============== 静态彩色名称系统 =================
// =====================================================


// =====================================================
// =============== 颜色池系统 =================
// =====================================================

// 允许的颜色代码池（排除§0黑色）
var colorPool = ['§1', '§2', '§3', '§4', '§5', '§6', '§7', '§8', '§9', '§a', '§b', '§c', '§d', '§e', '§f'];

/**
 * 获取静态随机文本
 * 基于种子生成确定性随机颜色，每次游戏重新加载时生成相同的颜色序列
 * @param {string} text - 要着色的文本
 * @param {string} [seed] - 随机种子，可选（默认为"shanhai"）
 * @returns {string} 彩色文本
 */
function getStaticRandomText(text, seed) {
    if (typeof text !== 'string') text = '文本无效';
    if (text.length === 0) return '§r';
    if (typeof seed !== 'string') seed = 'shanhai';

    function stringHash(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & 0xFFFFFFFF;
        }
        return Math.abs(hash);
    }

    function createLCG(seedNum) {
        var m = 4294967296;
        var a = 1664525;
        var c = 1013904223;
        var state = seedNum % m;
        return function() {
            state = (a * state + c) % m;
            return state / m;
        };
    }

    var random = createLCG(stringHash(seed));
    var result = "";
    for (var i = 0; i < text.length; i++) {
        var colorIndex = Math.floor(random() * colorPool.length);
        result += (colorPool[colorIndex] || '§a') + text[i];
    }
    return result + "§r";
}



/**
 * 获取固定颜色文本
 * 使用指定的固定颜色为文本着色
 * @param {string} text - 文本
 * @param {string} colorCode - 颜色代码
 * @returns {string} 彩色文本
 */
function getFixedColorText(text, colorCode) {
    // 防御性编程：确保输入有效
    if (typeof text !== 'string') {
        console.error('[山海私货] getFixedColorText: 文本必须是字符串，使用默认文本');
        text = '文本无效';
    }
    
    // 验证颜色代码（已移除警告以兼容Rhino）
    if (typeof colorCode !== 'string' || colorCode.length < 2 || colorCode[0] !== '§') {
        colorCode = '§a';
    }
    
    return colorCode + text + "§r";
}

/**
 * 获取交替颜色文本
 * 在两种颜色之间交替着色
 * @param {string} text - 文本
 * @param {string} color1 - 第一种颜色
 * @param {string} color2 - 第二种颜色
 * @returns {string} 彩色文本
 */
function getAlternatingColorText(text, color1, color2) {
    // 防御性编程：确保输入有效
    if (typeof text !== 'string') {
        console.error('[山海私货] getAlternatingColorText: 文本必须是字符串，使用默认文本');
        text = '文本无效';
    }
    
    // 验证颜色代码
    if (typeof color1 !== 'string' || color1.length < 2 || color1[0] !== '§') {
        color1 = '§a';
    }
    
    if (typeof color2 !== 'string' || color2.length < 2 || color2[0] !== '§') {
        color2 = '§b';
    }
    
    // 如果文本为空，返回空字符串（但添加重置代码）
    if (text.length === 0) {
        return '§r';
    }
    
    var result = "";
    for (var i = 0; i < text.length; i++) {
        var color = (i % 2 === 0) ? color1 : color2;
        result += color + text[i];
    }
    return result + "§r";
}

let syncStatsToGlobal = function() {
    var statsCopy = cloneRecipeStats();
    statsCopy.loaded = true;
    statsCopy.loadTime = new Date().toLocaleString();
    global.shanhaiRecipeStats = statsCopy;
    info(`统计数据已同步: 成功=${recipeStats.success}, 失败=${recipeStats.failed}, 总计=${recipeStats.total}`);
};

// ========== 山海私货全局API ==========
// 智能API合并：如果已有全局API，则合并而不是覆盖
var newShanhaiAPI = {
    getStats: protectAPI(
        function() { return recipeStats; },
        [], // 无参数
        { logPerformance: true }
    ),
    
    recordRecipe: protectAPI(
        recordRecipe,
        [
            function(p) { return validateString(p, 'type', 1, 50); },
            function(p) { return validateBoolean(p, 'ok'); },
            function(p) { return validateString(p, 'id', 1, 200); },
            function(p) { 
                if (p !== undefined && typeof p !== 'string') {
                    throw new Error('参数 msg 必须是字符串或undefined，实际类型: ' + typeof p);
                }
                return p;
            }
        ],
        { logPerformance: false }
    ),
    
    syncStats: protectAPI(
        syncStatsToGlobal,
        [],
        { logPerformance: true, requireOp: true }
    ),
    
    // 无限单元格创建函数
    infinityCell: function(cellString, type) {
        // 解析无限单元格格式，如 "expatternprovider:infinity_cell@gtceu:hydrogen"
        if (!cellString || typeof cellString !== 'string') {
            throw new Error('cellString 参数必须是字符串');
        }
        
        // 检查是否为无限单元格格式
        if (!cellString.includes('@')) {
            throw new Error('无限单元格格式必须包含 @ 符号，如 "expatternprovider:infinity_cell@gtceu:hydrogen"');
        }
        
        // 解析物品字符串
        var parsed = parseItemStringCellAPI(cellString);
        if (!parsed) {
            throw new Error('无法解析无限单元格格式: ' + cellString);
        }
        
        // 验证是否为无限单元格
        if (!parsed.id.includes('infinity_cell')) {
            warn('[shanhaiAPI.infinityCell] 警告: 物品ID不包含 "infinity_cell"，但格式包含 @ 符号: ' + cellString);
        }
        
        // 确定类型（物品 'i' 或流体 'f'）
        var itemType = type || 'i'; // 默认物品类型
        
        // 特殊处理：某些ID默认为流体类型
        if (parsed.innerId === 'gtceu:stellar_energy_rocket_fuel' || 
            parsed.innerId === 'gtceu:hydrogen' || 
            parsed.innerId === 'gtceu:helium') {
            itemType = 'f';
        }
        
        // 如果用户明确指定了类型，使用用户指定的类型
        if (type && (type === 'i' || type === 'f')) {
            itemType = type;
        }
        
        // 构建NBT标签
        var nbt = {
            record: {
                "#c": "ae2:" + itemType,
                "id": parsed.innerId
            }
        };
        
        // 返回Item对象
        return Item.of(parsed.id, nbt);
    },
    
    // 清除本地默认值（供配方控制API调用）
    clearLocalDefault: function(recipeId) {
        // 这个函数会在 ServerEvents.recipes 内部被覆盖
        // 这里只是一个占位符
        return false;
    },
    
    /**
     * 获取API版本号
     * @returns {string} API版本
     */
    getVersion: function() {
        return API_Version;
    }
};

// 合并现有API（如果存在）
if (global.shanhaiAPI && typeof global.shanhaiAPI === 'object') {
    // 复制现有API的所有属性到新API对象
    var mergedCount = 0;
    var overriddenCount = 0;
    for (var key in global.shanhaiAPI) {
        if (global.shanhaiAPI.hasOwnProperty(key)) {
            // 只有在新API中不存在该属性时才复制（避免覆盖）
            if (!newShanhaiAPI.hasOwnProperty(key)) {
                newShanhaiAPI[key] = global.shanhaiAPI[key];
                mergedCount++;
            } else {
                // 属性已存在，新版本优先
                overriddenCount++;
            }
        }
    }
    info('已合并现有山海API：合并 ' + mergedCount + ' 个属性，覆盖 ' + overriddenCount + ' 个属性');
} else {
    info('初始化新的山海API');
}

// 设置全局API
global.shanhaiAPI = newShanhaiAPI;


// =====================================================
// =============== 全局API接口 =================
// =====================================================

/**
 * 山海私货配方统计全局API
 * 
 * 该API提供了对山海私货配方统计系统的完整访问和控制。
 * 所有其他KubeJS脚本都可以通过 `global.shanhaiRecipeAPI` 访问。
 * 
 * @namespace shanhaiRecipeAPI
 * @version 2.1
 */
global.shanhaiRecipeAPI = {

    clearLocalDefault: function(recipeId) {
        if (global.shanhaiAPI && typeof global.shanhaiAPI.clearLocalDefault === 'function') {
            return global.shanhaiAPI.clearLocalDefault(recipeId);
        }
        return false;
    },
    

    

    /**
     * 同步统计数据到全局
     * 
     * 将当前统计数据复制到 `global.shanhaiRecipeStats` 以供其他脚本查询。
     * 通常在每个配方模块处理完成后调用。
     * 
     * @function sync
     * @memberof shanhaiRecipeAPI
     * @returns {void}
     * @example
     * // 在配方处理完成后同步数据
     * global.shanhaiRecipeAPI.sync();
     */
    sync: function() {
        return syncStatsToGlobal();
    },
    
    /**
     * 获取随机颜色代码
     * 从颜色池中随机选择一个颜色（排除§0黑色）
     * 
     * @function getRandomColor
     * @memberof shanhaiRecipeAPI
     * @returns {string} Minecraft颜色代码
     * @example
     * let color = global.shanhaiRecipeAPI.getRandomColor();
     * console.log(color); // 输出: §a (随机颜色代码)
     */
    getRandomColor: function() {
        return "§a";
    },
    
    /**
     * 获取随机彩虹文本
     * 为文本中的每个字符随机分配不同的颜色
     * 
     * @function getRandomRainbowText
     * @memberof shanhaiRecipeAPI
     * @param {string} text - 要着色的文本
     * @returns {string} 彩色文本
     * @example
     * let rainbow = global.shanhaiRecipeAPI.getRandomRainbowText("山海私货");
     * console.log(rainbow); // 输出: 每个字符随机颜色的文本
     */
    getRandomRainbowText: function(text) {
        if (typeof text !== 'string') text = '文本无效';
        if (text.length === 0) return '§r';
        var colors = ['§a', '§b', '§c', '§d', '§e', '§f', '§6', '§9', '§2', '§3', '§4', '§5'];
        var result = '';
        for (var i = 0; i < text.length; i++) {
            result += colors[Math.floor(Math.random() * colors.length)] + text[i];
        }
        return result + '§r';
    },
    
    /**
     * 获取静态随机文本
     * 基于种子生成确定性随机颜色，每次游戏重新加载时生成相同的颜色序列
     * 
     * @function getStaticRandomText
     * @memberof shanhaiRecipeAPI
     * @param {string} text - 要着色的文本
     * @param {string} [seed] - 随机种子，可选（默认为"shanhai"）
     * @returns {string} 彩色文本
     * @example
     * let staticRandom = global.shanhaiRecipeAPI.getStaticRandomText("山海私货", "myseed");
     * console.log(staticRandom); // 输出: 基于种子的确定性随机颜色文本
     */
    getStaticRandomText: function(text, seed) {
        return getStaticRandomText(text, seed);
    },
    
    /**
     * 获取会话随机单色文本
     * 每次游戏重新加载后从15个颜色的颜色池（绝对禁用§0）中随机挑选一个颜色
     * 整个文本使用同一个随机颜色
     * 
     * @function getSessionRandomSingleColorText
     * @memberof shanhaiRecipeAPI
     * @param {string} text - 要着色的文本
     * @returns {string} 彩色文本
     * @example
     * let sessionRandom = global.shanhaiRecipeAPI.getSessionRandomSingleColorText("山海私货");
     * console.log(sessionRandom); // 输出: 整个文本使用同一个随机颜色
     */
    getSessionRandomSingleColorText: function(text) {
        if (typeof text !== 'string') text = '文本无效';
        if (text.length === 0) return '§r';
        var colors = ['§a', '§b', '§c', '§d', '§e', '§f', '§6', '§9', '§2', '§3', '§4', '§5'];
        var c = colors[Math.floor(Math.random() * colors.length)];
        return c + text + '§r';
    },
    
    /**
    getRandomGradientText: function(text) {
        var colors = ['§c', '§6', '§e', '§a', '§b', '§9', '§d'];
        var startColor = colors[Math.floor(Math.random() * colors.length)];
        var endColor = colors[Math.floor(Math.random() * colors.length)];
        var result = "";
        var midPoint = Math.floor(text.length / 2);
        for (var i = 0; i < text.length; i++) {
            result += (i < midPoint ? startColor : endColor) + text[i];
        }
        return result + "§r";
    },
    
    /**
     * 获取固定颜色文本
     * 使用指定的固定颜色为文本着色
     * 
     * @function getFixedColorText
     * @memberof shanhaiRecipeAPI
     * @param {string} text - 文本
     * @param {string} colorCode - 颜色代码
     * @returns {string} 彩色文本
     * @example
     * let fixed = global.shanhaiRecipeAPI.getFixedColorText("山海私货", "§c");
     * console.log(fixed); // 输出: 红色文本
     */
    getFixedColorText: function(text, colorCode) {
        return getFixedColorText(text, colorCode);
    },
    
    /**
     * 获取交替颜色文本
     * 在两种颜色之间交替着色
     * 
     * @function getAlternatingColorText
     * @memberof shanhaiRecipeAPI
     * @param {string} text - 文本
     * @param {string} color1 - 第一种颜色
     * @param {string} color2 - 第二种颜色
     * @returns {string} 彩色文本
     * @example
     * let alternating = global.shanhaiRecipeAPI.getAlternatingColorText("山海私货", "§c", "§9");
     * console.log(alternating); // 输出: 红蓝交替的文本
     */
    getAlternatingColorText: function(text, color1, color2) {
        return getAlternatingColorText(text, color1, color2);
    },
    
    /**
     * 获取当前统计数据
     * 
     * 返回配方的完整统计数据，包含总计、成功、失败数量和类型分布。
     * 返回的是深拷贝对象，可以安全修改。
     * 
     * @function getStats
     * @memberof shanhaiRecipeAPI
     * @returns {Object} 统计数据对象
     * @property {number} total - 配方总数
     * @property {number} success - 成功数量
     * @property {number} failed - 失败数量
     * @property {number} typeFailed - 类型失败次数
     * @property {Object} byType - 按类型统计
     * @property {Array} errors - 错误列表
     * @example
     * let stats = global.shanhaiRecipeAPI.getStats();
     * console.log(`成功: ${stats.success}, 失败: ${stats.failed}, 总计: ${stats.total}`);
     */
    getStats: function() {
        var stats = cloneRecipeStats();
        stats.typeFailed = typeFailed;
        return stats;
    },
    
    /**
     * 获取错误列表
     * 
     * 返回所有失败配方的错误信息列表副本。
     * 返回的是数组副本，可以安全修改。
     * 
     * @function getErrors
     * @memberof shanhaiRecipeAPI
     * @returns {Array<Object>} 错误对象数组
     * @property {string} type - 机器类型
     * @property {string} name - 配方ID
     * @property {string} error - 错误信息
     * @example
     * var errors = global.shanhaiRecipeAPI.getErrors();
     * errors.forEach(function(err) { return console.log(err.type + ': ' + err.name + ' - ' + err.error); });
     */
    getErrors: function() {
        return recipeStats.errors.slice();
    },
    
    /**
     * 获取指定类型的错误
     * 
     * @function getErrorsByType
     * @memberof shanhaiRecipeAPI
     * @param {string} type - 要筛选的机器类型
     * @returns {Array<Object>} 该类型的错误列表
     * @example
     * let assemblerErrors = global.shanhaiRecipeAPI.getErrorsByType('assembler');
     */
    getErrorsByType: function(type) {
        var result = [];
        for (var i = 0; i < recipeStats.errors.length; i++) {
            var err = recipeStats.errors[i];
            if (err.type === type) {
                result.push({ type: err.type, name: err.name, error: err.error });
            }
        }
        return result;
    },
    
    /**
     * 获取统计摘要
     * 
     * 返回格式化的统计摘要字符串，适合在聊天或日志中显示。
     * 
     * @function getSummary
     * @memberof shanhaiRecipeAPI
     * @returns {string} 统计摘要
     * @example
     * let summary = global.shanhaiRecipeAPI.getSummary();
     * console.log(summary);
     * // 输出: 山海私货配方统计\n总计:121个配方\n√成功:19个\n×失败:102个
     */
    getSummary: function() {
        var stats = this.getStats();
        var summary = "山海私货配方统计\n";
        summary += "总计:" + stats.total + "个配方\n";
        summary += "√成功:" + stats.success + "个\n";
        summary += "×失败:" + stats.failed + "个\n";
        
        if (stats.errors.length > 0) {
            summary += "警告:配方库错误反馈联系qq：1982932217\n";//自行替换
            summary += "当前神人私货版本：" + Version + "\n";
            summary += "X失败示例：\n";
            
            // 显示前5个错误示例
            var maxErrors = Math.min(stats.errors.length, 5);
            for (var i = 0; i < maxErrors; i++) {
                var err = stats.errors[i];
                summary += (i + 1) + ".[" + err.type + "] " + err.name + "\n";
            }
            
            if (stats.errors.length > 5) {
                summary += "..还有" + (stats.errors.length - 5) + "个错误\n";
            }
            
            summary += "部分配方加载失败，请通知服务器管理员检查日志";
        }
        
        return summary;
    },
    
    /**
     * 重置统计数据
     * 
     * 清空所有统计数据，将计数器归零。
     * 注意：这会影响所有统计，谨慎使用。
     * 
     * @function reset
     * @memberof shanhaiRecipeAPI
     * @returns {void}
     * @example
     * // 重置统计（通常在测试或重新加载时使用）
     * global.shanhaiRecipeAPI.reset();
     */
    reset: function() {
        recipeStats = {
            total: 0, success: 0, failed: 0,
            byType: {}, errors: []
        };
        typeFailed = 0;
        info('配方统计数据已重置');
    },
    
    /**
     * 检查是否已加载
     * 
     * 检查山海私货脚本是否已完成加载并同步了统计数据。
     * 
     * @function isLoaded
     * @memberof shanhaiRecipeAPI
     * @returns {boolean} 是否已加载完成
     * @example
     * if (global.shanhaiRecipeAPI.isLoaded()) {
     *     console.log('山海私货已加载完成');
     * }
     */
    isLoaded: function() {
        return global.shanhaiRecipeStats && global.shanhaiRecipeStats.loaded;
    },
    
    /**
     * 获取版本信息
     * 
     * 返回当前山海私货脚本的版本信息。
     * 
     * @function getVersion
     * @memberof shanhaiRecipeAPI
     * @returns {string} 版本字符串
     * @example
     * console.log(`版本: ${global.shanhaiRecipeAPI.getVersion()}`);
     */
    getVersion: function() {
        return Version;
    },
    
    /**
     * 按类型获取统计
     * 
     * 获取指定机器类型的详细统计数据。
     * 
     * @function getStatsByType
     * @memberof shanhaiRecipeAPI
     * @param {string} type - 机器类型
     * @returns {Object|null} 类型统计数据，如果没有则返回null
     * @property {number} total - 该类型配方总数
     * @property {number} success - 该类型成功数量
     * @property {number} failed - 该类型失败数量
     * @example
     * let assemblerStats = global.shanhaiRecipeAPI.getStatsByType('assembler');
     * if (assemblerStats) {
     *     console.log(`组装机: ${assemblerStats.success}/${assemblerStats.total}`);
     * }
     */
    getStatsByType: function(type) {
        return recipeStats.byType[type] ? cloneTypeStats(recipeStats.byType[type]) : null;
    },
    
    /**
     * 获取所有类型统计
     * 
     * 返回所有机器类型的统计信息。
     * 
     * @function getAllTypeStats
     * @memberof shanhaiRecipeAPI
     * @returns {Object} 所有类型统计
     * @example
     * let allStats = global.shanhaiRecipeAPI.getAllTypeStats();
     * for (let type in allStats) {
     *     console.log(`${type}: ${allStats[type].success}/${allStats[type].total}`);
     * }
     */
    getAllTypeStats: function() {
        return cloneAllTypeStats(recipeStats.byType);
    },
    
    /**
     * 查找配方
     * 
     * 在所有配方数组中查找指定ID的配方。
     * 
     * @function findRecipeById
     * @memberof shanhaiRecipeAPI
     * @param {string} id - 配方ID
     * @returns {Object|null} 配方对象，包含配方、数组名称和索引信息
     * @property {Object} recipe - 配方数据
     * @property {string} arrayName - 所在数组名称
     * @property {number} index - 在数组中的索引
     * @example
     * let recipe = global.shanhaiRecipeAPI.findRecipeById('mk1_comsic');
     * if (recipe) {
     *     console.log(`找到配方: ${recipe.recipe.id} 在 ${recipe.arrayName}[${recipe.index}]`);
     * }
     */
    findRecipeById: function(id) {
        if (typeof global.shanhaiRecipeControlAPI !== 'undefined' && typeof global.shanhaiRecipeControlAPI.findRecipeById === 'function') {
            return global.shanhaiRecipeControlAPI.findRecipeById(id);
        }
        console.log('§e[山海配方API] shanhaiRecipeControlAPI.findRecipeById 不可用');
        return null;
    },
    
    /**
     * 获取配方详情
     * 
     * 获取配方的详细信息，包括输入、输出、机器参数等。
     * 
     * @function getRecipeDetails
     * @memberof shanhaiRecipeAPI
     * @param {string|Object} recipeOrId - 配方ID或配方对象
     * @returns {string} 配方详情字符串
     * @example
     * // 通过ID获取详情
     * let details = global.shanhaiRecipeAPI.getRecipeDetails('mk1_comsic');
     * console.log(details);
     * 
     * // 通过配方对象获取详情
     * let recipe = global.shanhaiRecipeAPI.findRecipeById('mk1_comsic');
     * if (recipe) {
     *     let details = global.shanhaiRecipeAPI.getRecipeDetails(recipe.recipe);
     *     console.log(details);
     * }
     */
    getRecipeDetails: function(recipeOrId) {
        if (typeof recipeOrId === 'string') {
            let result = null;
            if (typeof global.shanhaiRecipeControlAPI !== 'undefined' && typeof global.shanhaiRecipeControlAPI.findRecipeById === 'function') {
                result = global.shanhaiRecipeControlAPI.findRecipeById(recipeOrId);
            } else {
                console.log('§e[山海配方API] shanhaiRecipeControlAPI.findRecipeById 不可用');
            }
            if (!result) return '无配方信息';
            return getRecipeDetails(result.recipe);
        }
        return getRecipeDetails(recipeOrId);
    },
    
    /**
     * 获取错误详情
     * 
     * 获取指定索引的错误详细信息。
     * 
     * @function getErrorDetails
     * @memberof shanhaiRecipeAPI
     * @param {number} index - 错误索引（从0开始）
     * @returns {Object|null} 错误对象，包含类型、配方ID和错误信息
     * @property {string} type - 机器类型
     * @property {string} name - 配方ID
     * @property {string} error - 错误信息
     * @example
     * let error = global.shanhaiRecipeAPI.getErrorDetails(0);
     * if (error) {
     *     console.log(`错误: ${error.type} - ${error.name}: ${error.error}`);
     * }
     */
    getErrorDetails: function(index) {
        return getErrorDetails(index);
    },

    /**
     * HSL颜色转换为RGB颜色（工具函数）
     *
     * @function hslToRgb
     * @memberof shanhaiRecipeAPI
     * @param {number} h - 色相 (0-1)
     * @param {number} s - 饱和度 (0-1)
     * @param {number} l - 亮度 (0-1)
     * @returns {Array} [r, g, b] 范围 0-255
     * @example
     * let rgb = global.shanhaiRecipeAPI.hslToRgb(0.5, 1, 0.5); // 青色
     * console.log(rgb); // 输出: [0, 255, 255]
     */
    hslToRgb: function(h, s, l) {
        var r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            var hue2rgb = function hue2rgb(p, q, t) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
             r = hue2rgb(p, q, h + 1/3);
              g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    },

    isRecipeEnabled: function(recipeId) {
        if (typeof global.shanhaiRecipeControlAPI !== 'undefined' && typeof global.shanhaiRecipeControlAPI.isRecipeEnabled === 'function') {
            return global.shanhaiRecipeControlAPI.isRecipeEnabled(recipeId);
        }
        return true; // 默认启用（静默模式）
    },

    /**
     * 设置配方启用状态
     * @memberof shanhaiRecipeAPI
     * @param {string} recipeId - 配方ID
     * @param {boolean} enabled - 是否启用
     * @returns {boolean} 是否成功设置
     * @example
     * let success = global.shanhaiRecipeAPI.setRecipeEnabled('test_recipe', true);
     * console.log('设置启用状态结果:', success);
     */
    setRecipeEnabled: function(recipeId, enabled) {
        if (typeof global.shanhaiRecipeControlAPI !== 'undefined' && typeof global.shanhaiRecipeControlAPI.setRecipeEnabled === 'function') {
            return global.shanhaiRecipeControlAPI.setRecipeEnabled(recipeId, enabled);
        }
        return false; // 默认失败（静默模式）
    },

    /**
     * 设置配方默认值
     * @memberof shanhaiRecipeAPI
     * @param {string} recipeId - 配方ID
     * @param {boolean} defaultValue - 默认值（true/false）
     * @returns {boolean} 是否成功设置
     * @example
     * let success = global.shanhaiRecipeAPI.setRecipeDefault('test_recipe', false);
     * console.log('设置默认值结果:', success);
     */
    setRecipeDefault: function(recipeId, defaultValue) {
        console.log('§e[山海配方API] setRecipeDefault 功能已移除（重复代码清理）');
        return false;
    },

    /**
     * 获取配方默认值
     * @memberof shanhaiRecipeAPI
     * @param {string} recipeId - 配方ID
     * @returns {boolean|null} 默认值（如果不存在则返回null）
     * @example
     * let defaultValue = global.shanhaiRecipeAPI.getRecipeDefault('test_recipe');
     * console.log('配方默认值:', defaultValue);
     */
    getRecipeDefault: function(recipeId) {
        console.log('§e[山海配方API] getRecipeDefault 功能已移除（重复代码清理）');
        return null;
    },

    /**
     * 批量设置配方默认值
     * @memberof shanhaiRecipeAPI
     * @param {Object} defaults - 默认值对象 {recipeId: defaultValue, ...}
     * @returns {Object} 结果对象 {success: number, failed: number}
     * @example
     * let result = global.shanhaiRecipeAPI.batchSetRecipeDefaults({
     *     'recipe_a': false,
     *     'recipe_b': true,
     *     'recipe_c': false
     * });
     * console.log('批量设置结果:', result);
     */
    batchSetRecipeDefaults: function(defaults) {
        console.log('§e[山海配方API] batchSetRecipeDefaults 功能已移除（重复代码清理）');
        return {success: 0, failed: Object.keys(defaults).length};
    },

    /**
     * 获取所有配方默认值配置
     * @memberof shanhaiRecipeAPI
     * @returns {Object} 默认值配置对象
     * @example
     * let allDefaults = global.shanhaiRecipeAPI.getAllRecipeDefaults();
     * console.log('默认值总数:', Object.keys(allDefaults).length);
     */
    getAllRecipeDefaults: function() {
        console.log('§e[山海配方API] getAllRecipeDefaults 功能已移除（重复代码清理）');
        return {};
    },

    /**
     * 为所有现有配方初始化默认值（如果尚未设置）
     * @memberof shanhaiRecipeAPI
     * @param {boolean} defaultValue - 默认值（默认为false）
     * @returns {Object} 结果对象 {initialized: number, skipped: number}
     * @example
     * let result = global.shanhaiRecipeAPI.initializeMissingDefaults(false);
     * console.log('初始化结果:', result);
     */
    initializeMissingDefaults: function(defaultValue) {
        console.log('§e[山海配方API] initializeMissingDefaults 功能已移除（重复代码清理）');
        return {initialized: 0, alreadyExist: 0};
    },

    /**
     * 重置配方加载配置到默认值
     * @memberof shanhaiRecipeAPI
     * @returns {boolean} 是否成功重置
     * @example
     * let success = global.shanhaiRecipeAPI.resetRecipeLoadConfigToDefaults();
     * console.log('重置结果:', success);
     */
    resetRecipeLoadConfigToDefaults: function() {
        if (typeof global.shanhaiRecipeLoadConfig !== 'undefined') {
            global.shanhaiRecipeLoadConfig = {};
            console.log('§a[山海配方API] 配方加载配置已重置为默认值');
            return true;
        }
        console.log('§e[山海配方API] 配方加载配置未定义，无需重置');
        return false;
    },

    /**
     * 重置配方加载配置（现在会恢复默认值）
     * @memberof shanhaiRecipeAPI
     * @returns {boolean} 是否成功重置
     * @example
     * let success = global.shanhaiRecipeAPI.resetRecipeLoadConfig();
     * console.log('重置结果:', success);
     */
    resetRecipeLoadConfig: function() {
        return this.resetRecipeLoadConfigToDefaults();
    },

    /**
     * 在所有来源中查找配方（配方收集器和配方数组）
     * @memberof shanhaiRecipeAPI
     * @param {string} recipeId - 配方ID（可包含或不包含 dishanhai: 前缀）
     * @returns {Object|null} 包含配方和来源信息的对象，或null
     * @property {Object} recipe - 配方对象
     * @property {string} source - 来源描述（配方收集器或配方数组）
     * @example
     * let result = global.shanhaiRecipeAPI.findRecipeInAllSources('mk1_comsic');
     * if (result) console.log(`找到配方: ${result.recipe.id} (来源: ${result.source})`);
     */
    findRecipeInAllSources: function(recipeId) {
        // 标准化ID（去掉 dishanhai: 前缀）
        let searchId = recipeId;
        if (searchId.startsWith('dishanhai:')) {
            searchId = searchId.substring(10);
        }
        
        // 1. 先从配方收集器查找
        if (global.shanhaiRecipeInfoCollector) {
            var collected = global.shanhaiRecipeInfoCollector[searchId];
            if (collected) {
                return { recipe: collected, source: '配方收集器' };
            }
        }
        
        // 2. 从配方数组查找
        var recipeArrays = [
            { name: 'assrecipes', data: global.assrecipes },
            { name: 'universalRecipes', data: global.universalRecipes },
            { name: 'suprecipes_1', data: global.suprecipes_1 },
            { name: 'dishanhairecipes', data: global.dishanhairecipes },
            { name: 'recipes', data: global.recipes },
            { name: 'recipes_electrolyzers', data: global.recipes_electrolyzers }
        ];
        
        for (var i = 0; i < recipeArrays.length; i++) {
            var arr = recipeArrays[i];
            if (arr.data && Array.isArray(arr.data)) {
                var found = arr.data.find(function(r) {
                    var rId = r.id;
                    if (rId && rId.startsWith('dishanhai:')) {
                        rId = rId.substring(10);
                    }
                    return rId === searchId || r.id === recipeId;
                });
                if (found) {
                    return { recipe: found, source: '配方数组: ' + arr.name };
                }
            }
        }
        
        return null;
    },
    
    /**
     * 格式化配方信息显示
     * @memberof shanhaiRecipeAPI
     * @param {Object} sender - 命令发送者对象
     * @param {Object} result - findRecipeInAllSources 返回的结果
     * @param {string} recipeId - 原始配方ID
     * @example
     * let result = global.shanhaiRecipeAPI.findRecipeInAllSources('mk1_comsic');
     * if (result) global.shanhaiRecipeAPI.formatRecipeInfo(sender, result, 'mk1_comsic');
     */
    formatRecipeInfo: function(sender, result, recipeId) {
        let recipe = result.recipe;
        
        sender.tell('§6═══════ 配方信息 ═══════');
        sender.tell(`§7ID: §e${recipe.id || recipeId}`);
        sender.tell(`§7类型: §e${recipe.type}`);
        sender.tell(`§7来源: §a${result.source}`);
        
        if (recipe.itemInputs && recipe.itemInputs.length > 0) {
            sender.tell(`§7物品输入: §f${recipe.itemInputs.join('§7, §f')}`);
        }
        if (recipe.inputFluids && recipe.inputFluids.length > 0) {
            sender.tell(`§7流体输入: §b${recipe.inputFluids.join('§7, §b')}`);
        }
        if (recipe.itemOutputs && recipe.itemOutputs.length > 0) {
            sender.tell(`§7物品输出: §a${recipe.itemOutputs.join('§7, §a')}`);
        }
        if (recipe.outputFluids && recipe.outputFluids.length > 0) {
            sender.tell(`§7流体输出: §d${recipe.outputFluids.join('§7, §d')}`);
        }
        if (recipe.EUt !== undefined && recipe.EUt !== null) {
            sender.tell(`§7能耗: §e${recipe.EUt} EU/t`);
        }
        if (recipe.duration !== undefined && recipe.duration !== null) {
            sender.tell(`§7耗时: §e${recipe.duration} ticks`);
        }
        if (recipe.circuit !== undefined && recipe.circuit !== null) {
            sender.tell(`§7电路配置: §e${recipe.circuit}`);
        }
        if (recipe.notConsumable !== undefined && recipe.notConsumable !== null) {
            let nc = Array.isArray(recipe.notConsumable) ? recipe.notConsumable.join('§7, §e') : recipe.notConsumable;
            sender.tell(`§7非消耗品: §e${nc}`);
        }
        if (recipe.defaultEnabled !== undefined) {
            sender.tell(`§7默认启用: ${recipe.defaultEnabled ? '§a是' : '§c否'}`);
        }
        sender.tell('§6═══════════════════════');
    },
    
    /**
     * @memberof shanhaiRecipeAPI
     * @param {number} r - 红色 (0-255)
     * @param {number} g - 绿色 (0-255)
     * @param {number} b - 蓝色 (0-255)
     * @returns {string} 十六进制颜色代码，如 "#FF0000"
     * @example
     * let hex = global.shanhaiRecipeAPI.rgbToHex(255, 0, 0); // 红色
     * console.log(hex); // 输出: "#FF0000"
     */
    rgbToHex: function(r, g, b) {
        var toHex = function(c) {
            var hex = Math.round(c).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };
        return "#" + toHex(r) + toHex(g) + toHex(b);
    },

    /**
     * 获取TextUtil渐变文本
     * 
     * 使用LDLib的TextUtil类生成预定义的渐变样式文本。
     * 如果TextUtil不可用，则使用基本颜色模拟效果。
     * 
     * @function getTextUtilGradient
     * @memberof shanhaiRecipeAPI
     * @param {string} text - 要处理的文本
     * @param {string} style - 渐变样式名称
     * @returns {string} 渐变文本
     * @example
     * // 使用TextUtil.full_color样式
     * let gradient = global.shanhaiRecipeAPI.getTextUtilGradient("由CellAPI生成,显示由JEIcellAPI生成", "ultimateRainbow");
     * console.log(gradient); // 输出: 彩色渐变文本
     */
    getTextUtilGradient: function(text, style) {
        if (typeof text !== 'string') return Component.literal('').getString();
        try {
            if (typeof TextUtil !== 'undefined') {
                if (style === 'full_color' && typeof TextUtil.full_color === 'function') return TextUtil.full_color(text);
                if (style === 'golden' && typeof TextUtil.golden === 'function') return TextUtil.golden(text);
            }
        } catch(e) {}
        return '§7' + text;
    }
};

// =====================================================
// =============== 配方加载系统主控 =================
// =====================================================

// 全局配方信息收集器 (v2.39修复：移到ServerEvents.recipes外部)
var recipeInfoCollector = {};

// ========== AE包NBT生成函数（提前定义，供配方库使用）==========
function getShanhaiPackNBT(packId) {
    if (!global.shanhaiPackDefs || !global.shanhaiPackDefs[packId]) return '';
    var pack = global.shanhaiPackDefs[packId];
    return pack.nbt || pack.sdaNbt || '';
}

var packed_cell_nbt2 = function(list, displayName, lore) {
    try {
        var api = Java.loadClass('com.dishanhai.gt_shanhai.api.DShanhaiNBTAPI');
        return String(api.buildSDAFromList(list || [], displayName || null, Array.isArray(lore) ? lore : (lore ? [lore] : []), []));
    } catch(e1) {
        try {
            return String(Java.loadClass('com.dishanhai.gt_shanhai.api.DShanhaiNBTAPI').buildAECellNBTFromList(list || [], displayName || null, Array.isArray(lore) ? lore : (lore ? [lore] : [])));
        } catch(e2) { return ''; }
    }
};

// ========== 超级磁盘阵列(SDA)构建器（提前定义，供配方库使用）==========
var DShanhaiSDA = {
    create: function(name) {
        var api = Java.loadClass('com.dishanhai.gt_shanhai.api.DShanhaiNBTAPI');
        return {
            _items: [], _vc: [], _name: name || '超级磁盘阵列', _lore: [],
            itemOutput: function(item) {
                if (item !== null && item !== undefined) this._items.push(String(item));
                return this;
            },
            itemOutputs: function(items) {
                var arr;
                if (items === null || items === undefined) return this;
                if (typeof items === 'string') {
                    arr = items.indexOf('\n') !== -1 ? items.trim().split('\n') : [items];
                } else {
                    arr = Array.isArray(items) ? items : [items];
                }
                for (var i = 0; i < arr.length; i++) this.itemOutput(arr[i]);
                return this;
            },
            infinityOutput: function(id) {
                if (id === null || id === undefined) return this;
                try {
                    var entry = api.buildInfinityCellEntry(String(id));
                    if (entry) this._items.push(String(entry));
                } catch(e) {
                    this._items.push('1x expatternprovider:infinity_cell@' + String(id));
                }
                return this;
            },
            infinityOutputs: function(ids) {
                var arr = Array.isArray(ids) ? ids : [ids];
                for (var i = 0; i < arr.length; i++) this.infinityOutput(arr[i]);
                return this;
            },
            virtualCell: function(type, bytes, itemsNbt) {
                try { this._vc.push(api.buildVirtualCell(type, bytes, itemsNbt || null)); } catch(e) {}
                return this;
            },
            itemVirtualCell: function(bytes, itemsNbt) {
                return this.virtualCell('item', bytes, itemsNbt || null);
            },
            fluidVirtualCell: function(bytes, itemsNbt) {
                return this.virtualCell('fluid', bytes, itemsNbt || null);
            },
            virtualCellNBT: function(nbt) {
                if (nbt !== null && nbt !== undefined) this._vc.push(String(nbt));
                return this;
            },
            lore: function(lines) {
                var arr = Array.isArray(lines) ? lines : [lines];
                for (var i = 0; i < arr.length; i++) if (arr[i] !== null && arr[i] !== undefined) this._lore.push(String(arr[i]));
                return this;
            },
            buildNBT: function() {
                try { return String(api.buildSDAFromList(this._items, this._name, this._lore, this._vc)); }
                catch(e1) {
                    try { return String(api.buildAECellNBTFromList(this._items, this._name, this._lore)); }
                    catch(e2) { return ''; }
                }
            },
            build: function() {
                var nbt = this.buildNBT();
                return nbt ? Item.of('gt_shanhai:super_disk_array', nbt) : Item.of('gt_shanhai:super_disk_array');
            }
        };
    },
    virtualCell: function(type, bytes, itemsNbt) {
        try {
            var api = Java.loadClass('com.dishanhai.gt_shanhai.api.DShanhaiNBTAPI');
            return api.buildVirtualCell(type, bytes, itemsNbt || null);
        } catch(e) {}
        return '';
    }
};

// 导出到 global（在 ServerEvents.recipes 之前，确保配方库可以访问）
if (typeof global !== 'undefined') {
    global.getShanhaiPackNBT = getShanhaiPackNBT;
    global.packed_cell_nbt2 = packed_cell_nbt2;
    global.DShanhaiSDA = DShanhaiSDA;
}

ServerEvents.recipes(function(e) {

    // =====================================================
    // =============== 配方默认值系统 (v2.4新增) ==========
    // =====================================================
    
    // 本地配方默认值存储
    var localRecipeDefaults = {};
    
    // 配方信息收集器 (v2.38新增，v2.39修复：已移到外部定义)

    /**
     * 设置配方的本地默认值
     * @param {string} recipeId - 配方ID
     * @param {boolean} defaultValue - 默认值 (true=启用, false=禁用)
     */
    function setLocalRecipeDefault(recipeId, defaultValue) {
        if (typeof recipeId !== 'string' || !recipeId.trim()) {
            warn('setLocalRecipeDefault: 配方ID必须是有效的字符串');
            return false;
        }
        if (typeof defaultValue !== 'boolean') {
            warn('setLocalRecipeDefault: 默认值必须是布尔值 (true/false)');
            return false;
        }
        localRecipeDefaults[recipeId] = defaultValue;
        debug('✅ 设置配方本地默认值: ' + recipeId + ' = ' + defaultValue);
        return true;
    }
    
    /**
     * 获取配方的本地默认值
     * @param {string} recipeId - 配方ID
     * @returns {boolean|null} 默认值，如果未设置则返回null
     */
    function getLocalRecipeDefault(recipeId) {
        if (localRecipeDefaults.hasOwnProperty(recipeId)) {
            return localRecipeDefaults[recipeId];
        }
        return null;
    }
    
    /**
     * 检查配方是否有本地默认值
     * @param {string} recipeId - 配方ID
     * @returns {boolean} 是否有本地默认值
     */
    function hasLocalRecipeDefault(recipeId) {
        return localRecipeDefaults.hasOwnProperty(recipeId);
    }
    
    /**
     * 删除配方的本地默认值
     * @param {string} recipeId - 配方ID
     * @returns {boolean} 是否成功删除
     */
    function removeLocalRecipeDefault(recipeId) {
        if (localRecipeDefaults.hasOwnProperty(recipeId)) {
            delete localRecipeDefaults[recipeId];
            debug('🗑️ 删除配方本地默认值: ' + recipeId);
            return true;
        }
        return false;
    }
    
    // 覆盖 global.shanhaiAPI.clearLocalDefault 函数，使其能访问本地默认值
    global.shanhaiAPI.clearLocalDefault = function(recipeId) {
        if (typeof recipeId !== 'string' || !recipeId.trim()) {
            return false;
        }
        try {
            var totalRemoved = 0;
            
            // 尝试清除原始ID
            if (removeLocalRecipeDefault(recipeId)) totalRemoved++;
            
            // 如果ID以dishanhai:开头，也尝试清除去掉前缀的版本
            var normalizedId = recipeId;
            if (recipeId.startsWith('dishanhai:')) {
                normalizedId = recipeId.substring(10);
                if (removeLocalRecipeDefault(normalizedId)) totalRemoved++;
            } else if (recipeId.startsWith('dishanahi:')) {
                normalizedId = recipeId.substring(9);
                if (removeLocalRecipeDefault(normalizedId)) totalRemoved++;
            }
            
            // 如果没有前缀，也尝试添加dishanhai:前缀的版本
            if (recipeId.indexOf(':') === -1) {
                var prefixedId = 'dishanhai:' + recipeId;
                if (removeLocalRecipeDefault(prefixedId)) totalRemoved++;
            }
            
            if (totalRemoved > 0) {
                debug('已清除配方的本地默认值: ' + recipeId + ' (共 ' + totalRemoved + ' 个变体)');
            }
            return totalRemoved > 0;
        } catch (e) {
            error('清除本地默认值时出错: ' + e);
            return false;
        }
    };
    
    /**
     * 获取所有本地默认值
     * @returns {Object} 所有本地默认值的副本
     */
    function getAllLocalRecipeDefaults() {
        return JSON.parse(JSON.stringify(localRecipeDefaults));
    }
    
    info(`✅ 主模块配方注册完成`);
    
    // 自动配方统计功能 (v2.40新增)
    function generateRecipeStatistics() {
        var totalRecipes = Object.keys(recipeInfoCollector).length;
        if (totalRecipes === 0) {
            info('📊 配方统计: 未收集到任何配方信息');
            return;
        }
        
        // 按类型统计
        var typeStats = {};
        var defaultEnabledStats = { true: 0, false: 0 };
        
        for (var id in recipeInfoCollector) {
            if (recipeInfoCollector.hasOwnProperty(id)) {
                var recipe = recipeInfoCollector[id];
                var type = recipe.type || 'unknown';
                typeStats[type] = (typeStats[type] || 0) + 1;
                
                // 统计默认启用状态
                if (recipe.defaultEnabled === true) {
                    defaultEnabledStats.true++;
                } else {
                    defaultEnabledStats.false++;
                }
            }
        }
        
        // 生成统计报告
        info(`📊 配方统计: 共 ${totalRecipes} 个配方`);
        info(`📊 默认启用: ${defaultEnabledStats.true} 个启用, ${defaultEnabledStats.false} 个禁用`);
        
        // 按类型输出统计（只显示数量大于0的类型）
        var typeReport = [];
        for (var type in typeStats) {
            if (typeStats.hasOwnProperty(type) && typeStats[type] > 0) {
                typeReport.push(`${type}: ${typeStats[type]}`);
            }
        }
        if (typeReport.length > 0) {
            info(`📊 按类型统计: ${typeReport.join(', ')}`);
        }
        
        // 将统计信息也保存到全局收集器中
        recipeInfoCollector._statistics = {
            total: totalRecipes,
            defaultEnabled: defaultEnabledStats,
            byType: typeStats,
            generatedAt: Date.now()
        };
    }
    
    // 生成配方统计
    generateRecipeStatistics();
    
    // 导出配方收集器到全局 (v2.39修复：确保正确导出)
    if (typeof global !== 'undefined') {
        // 导出到 shanhaiRecipeCollector（供测试脚本使用）
        global.shanhaiRecipeCollector = recipeInfoCollector;
        // 同时保留 shanhaiRecipeInfoCollector 以保持兼容性
        global.shanhaiRecipeInfoCollector = recipeInfoCollector;
        info(`📦 配方收集器已导出到全局，共 ${Object.keys(recipeInfoCollector).length} 个配方`);
    }
    
    // 导出配方数组到全局对象，供API访问（必须在ServerEvents.recipes回调内部）
    if (typeof assrecipes !== 'undefined') global.assrecipes = assrecipes;
    if (typeof universalRecipes !== 'undefined') global.universalRecipes = universalRecipes;
    if (typeof suprecipes_1 !== 'undefined') global.suprecipes_1 = suprecipes_1;
    if (typeof recipes_voidfluxs !== 'undefined') global.recipes_voidfluxs = recipes_voidfluxs;
    if (typeof dishanhairecipes !== 'undefined') global.dishanhairecipes = dishanhairecipes;
    if (typeof recipes !== 'undefined') global.recipes = recipes;
    if (typeof recipes_electrolyzers !== 'undefined') global.recipes_electrolyzers = recipes_electrolyzers;
    
    info('配方数组已导出到全局对象');

    DShanhaiRecipeEngine.printStats();

});

// ========== 第二个 ServerEvents.recipes（Mekanism 配方删除）========== 其实际为有forge tag的物品 需先删除tag
ServerEvents.recipes(e => {
    var timer_mek_remove = new Timer('Mekanism配方删除模块');
    info('📝 开始处理 Mekanism/Allthemodium 配方删除...');
    
    if (Platform.isLoaded('mekanism')){
        let removeList = [
            { input: 'mekanism:ingot_steel', mod: 'mekanism' },
            { input: "#forge:ingots", mod: 'mekanism' },
            { input: 'mekanism:ingot_tin', mod: 'mekanism' },
            { input: 'mekanism:ingot_bronze', mod: 'mekanism' },
            { input: '#forge:ingots/lead', mod: 'mekanism' },
            { input: '#forge:ingots/osmium', mod: 'mekanism' },
            { input: '#forge:ingots/aluminum' },
            { input: '#forge:ingots', mod: "allthemodium" },
            { input: '#forge:storage_blocks', mod: 'allthemodium' },
            { input: '#forge:plates', mod: 'allthemodium' },
            { input: '#forge:gears', mod: 'allthemodium' },
            { input: '#forge:dusts', mod: 'allthemodium' }
        ];
        
        removeList.forEach(item => {
            try {
                e.remove(item);
                debug(`删除配方: input=${item.input}, mod=${item.mod || '无'}`);
            } catch(err) {
                warn(`删除配方失败: ${err.message}`);
            }
        });
        
            // 特殊处理：保留ATM三兄弟
        e.remove({input: '#forge:ingots', mod: 'allthemodium', not: [{ id: 'allthemodium:allthemodium_ingot' },{ id: 'allthemodium:vibranium_ingot' },{ id: 'allthemodium:unobtainium_ingot' }]});    
        let outputRemoveList = [
            { output: 'mekanism:ingot_tin', mod: 'mekanism' },
            { output: 'mekanism:block_steel', mod: 'mekanism' },
            { output: 'mekanism:ingot_lead', mod: 'mekanism' },
            { output: '#forge:ingot', mod: 'mekanism' },
            { output: 'mekanism:ingot_uranium', mod: 'mekanism' },
            { output: 'kubejs:contained_reissner_nordstrom_singularity', type: 'stellar_forge' },
            { output: '#alltheores:ore_hammers' },
            { output: '#forge:ingots', mod: 'allthemodium', not: [{id:'allthemodium:allthemodium_ingot'},{id:'allthemodium:vibranium_ingot'},{id:'allthemodium:unobtainium_ingot'}] },
            { output: '#forge:dusts', mod: "allthemodium" },
            { output: '#forge:raw_materials', mod: 'allthemodium' },
            { output: '#forge:gears', mod: 'allthemodium' },
            { output: '#forge:plates', mod: 'allthemodium' },
            { output: '#forge:storage_blocks', mod: 'allthemodium' },
            { output: '#forge:ingots', mod: 'alltheores' }
            
        ];
        
        outputRemoveList.forEach(item => {
            try {
                e.remove(item);
                debug(`删除输出配方: output=${item.output}, mod=${item.mod || '无'}`);
            } catch(err) {
                warn(`删除输出配方失败: ${err.message}`);
            }
        });
    }
    timer_mek_remove.end();
});


// ========== 物品标签修改 ==========
ServerEvents.tags('item', e => {
    var timer_item_tags = new Timer('物品标签修改');
    info('🏷️ 修改物品标签初始化...');
    
    try {
        e.remove('forge:ingots/naquadah_alloy','sgjourney:naquadah_alloy');//硅岩锭
        e.remove('forge:dusts/salt','mekanism:salt');
        e.remove('forge:rods/naquadah_alloy','sgjourney:naquadah_rod');//硅岩棒
        e.remove('forge:ingots/naquadah','sgjourney:naquadah');//武器级硅岩
        e.remove('forge:dyes/yellow','mekanism:dust_sulfur')
        e.add('minecraft:beacon_base_blocks','avaritia:infinity');
        debug('标签修改完成');
    } catch(err) {
        error(`标签修改失败: ${err.message}`);
    }
    
    timer_item_tags.end();
});

// ========== 流体标签修改 ==========
ServerEvents.tags('fluid', e => {
    var timer_fluid_tags = new Timer('流体标签修改');
    info('💧 开始修改流体标签...');
    
    const removals = [
        ['forge:chlorine', 'mekanism:chlorine'],
        ['forge:deuterium', 'mekanismgenerators:deuterium'],
        ['forge:tritium', 'mekanismgenerators:tritium'],
        ['forge:hydrogen', 'mekanism:hydrogen'],
        ['forge:sulfur_trioxide', 'sulfur_trioxide'],
        ['forge:sulfur_dioxide', 'mekanism:sulfur_dioxide'],
        ['forge:sulfuric_acid', 'mekanism:sulfuric_acid'],
        ['forge:hydrofluoric_acid', 'mekanism:hydrofluoric_acid'],
        ['forge:uranium_hexafluoride', 'mekanism:uranium_hexafluoride'],
        ['forge:steam', 'mekanism:steam'],
        ['forge:oxygen', 'mekanism:oxygen'],
        ['forge:oxygen', 'mekanism:flowing_oxygen'],
        ['forge:hydrogen', 'mekanism:flowing_hydrogen'],
        ['forge:chlorine', 'mekanism:flowing_chlorine'],
        ['forge:lithium','mekanism:flowing_lithium'],
        ['forge:lithium','mekanism:lithium']
    ];
    
    removals.forEach(([tag, fluid]) => {
        try {
            e.remove(tag, fluid);
            debug(`移除流体标签: ${tag} -> ${fluid}`);
        } catch(err) {
            warn(`移除流体标签失败: ${tag} -> ${fluid} - ${err.message}`);
        }
    });
    
    timer_fluid_tags.end();
});

// ========== 批量物品标签删除 ========== tag删除 彻底移除隐患
ServerEvents.tags('item', event => {
    var timer_batch_item_tags = new Timer('批量物品标签删除');
    info('🗑️ 开始批量删除物品标签...');
    
    const metals = ['steel','aluminum','lead','nickel','iridium','platinum','osmium','invar','bronze','enderium','lumium','brass','diamond','silver','tin','uranium','zinc','copper','iron','gold','dusts','steel','brass_dust','electrum','sulfur','fluorite','charcoal','lithium','iobsidian','lapis','coal','fluorite','vibranium','ruby','sapphire'];
    const tagTypes = ['forge:ingots','forge:storage_blocks','forge:nuggets','forge:plates','forge:rods','forge:gears','forge:dusts','forge:dyes/yellow'];
    const Mods = ['mekanism', 'alltheores','allthemodium'];
    
    let removedCount = 0;
    
    metals.forEach(metal => {
        tagTypes.forEach(type => {
            const tag = `${type}/${metal}`;
            try {
                event.get(tag).getObjectIds().forEach(id => {
                    if (Mods.includes(id.namespace)) {
                        event.remove(tag, id);
                        removedCount++;
                        debug(`移除标签: ${tag} -> ${id}`);
                    }
                });
            } catch(err) {
                debug(`处理标签 ${tag} 时出错: ${err.message}`);
            }
        });
    });
    
    info(`批量删除完成，共移除 ${removedCount} 个标签条目`);
    timer_batch_item_tags.end();
});

// ========== 256k物品包API - 完整修复版 ==========(cellapi)
// 版本 2.0 - 修复所有已知问题

// ========== 内部工具函数 ==========

// 解析物品字符串 "1x minecraft:diamond" → { id: "minecraft:diamond", count: 1, innerId: null }
// 支持扩展格式 "1x expatternprovider:infinity_cell@gtceu:stellar_energy_rocket_fuel"
function parseItemStringCellAPI(str) {
    if (!str || typeof str !== 'string') {
        throw new Error('无效的物品字符串: ' + str);
    }
    
    str = str.trim();
    
    // 支持不带数量的情况，如 "minecraft:stone" → 自动添加 "1x " 前缀
    if (!str.includes('x ')) {
        str = '1x ' + str;
    }
    
    var match = str.match(/^(\d+)\s*x\s*([^@]+)(?:@(.+))?$/);
    if (!match) {
        throw new Error("无效的物品格式，应使用 '数量x 物品ID' 或 '数量x 物品ID@内部ID' 或 '物品ID': " + str);
    }
    
    return {
        count: parseInt(match[1], 10),
        id: match[2].trim(),
        innerId: match[3] ? match[3].trim() : null
    };
}

// 格式化流体字符串 "1000 mb water" → { amount: 1000, fluid: "water" }
function parseFluidStringCellAPI(str) {
    if (!str || typeof str !== 'string') {
        throw new Error('无效的流体字符串: ' + str);
    }
    
    let match = str.match(/^(\d+)\s*(mb|mB|b|B)?\s*(.+)$/i);
    if (!match) {
        throw new Error("无效的流体格式，应使用 '数量 流体名' 或 '数量mb 流体名': " + str);
    }
    
    let amount = parseInt(match[1], 10);
    let unit = (match[2] || 'mb').toLowerCase();
    let fluidName = match[3].trim();
    
    // 单位标准化到mb（GTCEu使用的单位）
    // mb 和 mB 保持原样（已经是以mb为单位）
    // b 和 B 转换为mb（1桶 = 1000mb）
    if (unit === 'b') {
        amount = amount * 1000; // 1桶 = 1000mb
    }
    // 注意：unit可能为 'mb'、'mB'、'b' 或 undefined
    // 当unit为undefined时，默认使用'mb'，不需要转换
    
    return { amount: amount, fluid: fluidName };
}

// 配方验证器 - 检查配方参数是否有效
function validateCellRecipe(itemList, inputItems) {
    let errors = [];
    
    // 检查物品列表是否为空
    if (!itemList || !Array.isArray(itemList) || itemList.length === 0) {
        errors.push('物品列表不能为空');
    }
    
    // 检查输入物品是否有效
    if (inputItems && Array.isArray(inputItems)) {
        inputItems.forEach(item => {
            try {
                parseItemStringCellAPI(item);
            } catch (e) {
                errors.push(`无效输入物品: ${item} - ${e.message}`);
            }
        });
    }
    
    // 检查输出数量是否超过 256k 容量 (约 1024 种物品)
    if (itemList && itemList.length > 1024) {
        errors.push(`物品数量 ${itemList.length} 超过 256k 容量限制 (1024)`);
    }
    
    return errors;
}

// 配方预览/导出功能 - 导出配方为JSON格式
function exportRecipeToJson(recipeId) {
    // 尝试从全局配方API中查找配方
    if (global.shanhaiRecipeAPI && typeof global.shanhaiRecipeAPI.findRecipeInAllSources === 'function') {
        let result = global.shanhaiRecipeAPI.findRecipeInAllSources(recipeId);
        if (result && result.recipe) {
            try {
                return JSON.stringify(result.recipe, null, 2);
            } catch (e) {
                warn(`[256k Cell API] 导出配方JSON失败 (${recipeId}): ${e.message}`);
                return null;
            }
        }
    }
    
    // 如果无法从全局API获取，尝试从已注册的CellAPI配方中查找
    // 注意：这里需要额外的数据结构来存储CellAPI配方的详细信息
    // 目前暂时返回null，未来可以扩展
    warn(`[256k Cell API] 无法找到配方: ${recipeId} (导出功能需要配方详细信息)`);
    return null;
}

// 版本兼容性检查
function checkCompatibility(expectedVersion) {
    if (!expectedVersion) {
        throw new Error('expectedVersion 参数不能为空');
    }
    
    const currentVersion = '1.0.0'; // CellAPI版本，与CellAPI.version一致
    const currentParts = currentVersion.split('.').map(Number);
    const expectedParts = expectedVersion.split('.').map(Number);
    
    // 简单的主版本号检查：主版本号必须相同
    if (currentParts[0] !== expectedParts[0]) {
        return {
            compatible: false,
            reason: `主版本不兼容: 当前 ${currentVersion}, 期望 ${expectedVersion}`,
            current: currentVersion,
            expected: expectedVersion
        };
    }
    
    // 次版本号检查：当前次版本号应大于等于期望次版本号
    if (currentParts[1] < expectedParts[1]) {
        return {
            compatible: false,
            reason: `次版本过低: 当前 ${currentVersion}, 期望至少 ${expectedVersion}`,
            current: currentVersion,
            expected: expectedVersion
        };
    }
    
    // 修订号检查：如果次版本相同，修订号应大于等于期望修订号
    if (currentParts[1] === expectedParts[1] && currentParts[2] < expectedParts[2]) {
        return {
            compatible: false,
            reason: `修订号过低: 当前 ${currentVersion}, 期望至少 ${expectedVersion}`,
            current: currentVersion,
            expected: expectedVersion
        };
    }
    
    return {
        compatible: true,
        reason: `版本兼容: 当前 ${currentVersion}, 期望 ${expectedVersion}`,
        current: currentVersion,
        expected: expectedVersion
    };
}

// 性能监控 - 记录配方注册耗时
function measurePerformance(fn, context) {
    return function() {
        var args = Array.prototype.slice.call(arguments);  // 手动转换参数
        var start = Date.now();
        try {
            var result = fn.apply(context, args);
            var duration = Date.now() - start;
            if (duration > 1000) {
                warn('[256k Cell API] 性能警告: ' + (fn.name || '匿名函数') + ' 执行耗时 ' + duration + 'ms');
            }
            return result;
        } catch (err) {
            var duration = Date.now() - start;
            error('[256k Cell API] 性能错误: ' + (fn.name || '匿名函数') + ' 执行 ' + duration + 'ms 后失败: ' + err.message);
            throw err;
        }
    };
}

// 根据物品种类数量估算所需电压等级（改进版）
function estimateTierCellAPI(count, hasFluid, hasInfinityCell) {
    // 参数默认值处理
    if (hasFluid === undefined) hasFluid = false;
    if (hasInfinityCell === undefined) hasInfinityCell = false;
    
    // 基础电压等级映射
    let baseTier = {
        1: 32,      // LV - 基础配方
        10: 128,    // MV
        30: 512,    // HV
        50: 2048,   // EV
        80: 8192,   // IV
        120: 32768, // LuV
        200: 131072 // ZPM
    };
    
    // 根据物品数量确定基础电压
    let tier = 32; // 默认LV
    for (let threshold in baseTier) {
        if (count >= parseInt(threshold, 10)) {
            tier = baseTier[threshold];
        }
    }
    
    // 包含无限单元格时提高电压（4倍）
    if (hasInfinityCell) {
        tier *= 4;
    }
    
    // 包含流体时确保最低电压为MV（128 EU/t）
    if (hasFluid) {
        tier = Math.max(tier, 128);
    }
    
    // 限制最高电压为ZPM（131072 EU/t）
    return Math.min(tier, 131072);
}

// 根据物品数量估算配方耗时
function estimateDurationCellAPI(totalItems) {
    if (totalItems < 100) return 100;
    if (totalItems < 500) return 200;
    if (totalItems < 1000) return 300;
    if (totalItems < 5000) return 400;
    if (totalItems < 10000) return 600;
    return 800;
}

// ========== 核心NBT构造器 ==========

// 兼容旧 CellAPI 名称，实际 NBT 构造已下沉到 Java 侧。
function buildCellNBTCellAPI(items, cellName, lore) {
    try {
        return String(Java.loadClass('com.dishanhai.gt_shanhai.api.DShanhaiNBTAPI').buildAECellNBTFromList(items || [], cellName || null, Array.isArray(lore) ? lore : (lore ? [lore] : [])));
    } catch(e) {
        error('[CellAPI] Java NBT 构建失败: ' + e.message);
        return '';
    }
}

// ========== CellAPI 默认值系统集成（继承配方默认值系统的启用/禁用检查） ==========
/**
 * 检查 CellAPI 配方是否应该在默认值系统中启用
 * 继承配方默认值系统的 defaultEnabled 检查逻辑，支持 recipeLoadConfig 和 localRecipeDefaults
 * @param {string} recipeId - 配方ID
 * @param {boolean} [defaultEnabled] - 未设置配置文件/本地默认值时的回退值（默认 true）
 * @returns {boolean} true=启用, false=禁用
 */
function _isCellRecipeEnabled(recipeId, defaultEnabled) {
    // 1. 配置文件检查（最高优先级，与配方默认值系统的 shanhaiRecipeLoadConfig 检查一致）
    if (typeof global !== 'undefined' && global.shanhaiRecipeLoadConfig) {
        if (global.shanhaiRecipeLoadConfig.hasOwnProperty(recipeId)) {
            return global.shanhaiRecipeLoadConfig[recipeId] === true;
        }
        // 尝试带 dishanhai: 前缀的版本
        if (global.shanhaiRecipeLoadConfig.hasOwnProperty('dishanhai:' + recipeId)) {
            return global.shanhaiRecipeLoadConfig['dishanhai:' + recipeId] === true;
        }
        // 如果传入的 recipeId 已经带前缀，尝试去掉前缀
        if (recipeId.indexOf(':') !== -1) {
            var stripped = recipeId.substring(recipeId.indexOf(':') + 1);
            if (global.shanhaiRecipeLoadConfig.hasOwnProperty(stripped)) {
                return global.shanhaiRecipeLoadConfig[stripped] === true;
            }
        }
    }

    // 2. 本地默认值检查（setLocalRecipeDefault 设置的，与配方默认值系统的 localRecipeDefaults 共享）
    if (typeof getLocalRecipeDefault === 'function') {
        var localDefault = getLocalRecipeDefault(recipeId);
        if (localDefault !== null) return localDefault;

        // 尝试去掉命名空间后再查一次
        if (recipeId.indexOf(':') !== -1) {
            var strippedId = recipeId.substring(recipeId.indexOf(':') + 1);
            if (strippedId !== recipeId) {
                localDefault = getLocalRecipeDefault(strippedId);
                if (localDefault !== null) return localDefault;
            }
        }
    }

    // 3. 使用调用方传入的 defaultEnabled（如果有）
    //    同步到 localRecipeDefaults + recipeControlAPI，行为与配方默认值系统一致
    if (typeof defaultEnabled === 'boolean') {
        if (typeof setLocalRecipeDefault === 'function') {
            setLocalRecipeDefault(recipeId, defaultEnabled);
        }
        if (typeof global !== 'undefined' && global.shanhaiRecipeControlAPI &&
            typeof global.shanhaiRecipeControlAPI.setRecipeEnabled === 'function') {
            global.shanhaiRecipeControlAPI.setRecipeEnabled(recipeId, defaultEnabled);
        }
        return defaultEnabled;
    }

    // 4. 默认启用
    return true;
}

// 自动生成组装机配方，支持流体输入、电路配置、耗时/功率自定义
// 修改后的配方生成器 - 不依赖外部 event 参数
function addCellAssemblerRecipeCellAPI(recipeId, cellName, itemList, lore, inputItems, inputFluids, circuit, duration, eut, defaultEnabled) {
    // 注意：此函数需要在 ServerEvents.recipes 事件内部调用 
    // 因为它需要访问 gtceu 对象 
    
    try { 
        // 配方去重检查
        if (_registeredCellRecipes.has(recipeId)) {
            warn('[256k Cell API] 配方 ' + recipeId + ' 已存在，跳过注册');
            return false;
        }
        
        // 参数默认值 
        circuit = (circuit !== undefined && circuit !== null) ? circuit : 1; 
        duration = duration || estimateDurationCellAPI(itemList.reduce(function(sum, item) { 
            var parsed = parseItemStringCellAPI(item); 
            return sum + parsed.count; 
        }, 0)); 
        // 智能电压估算：检查是否包含无限单元格和流体
        var hasInfinityCell = itemList.some(function(item) { return item.includes('expatternprovider:infinity_cell'); });
        var hasFluid = inputFluids && Array.isArray(inputFluids) && inputFluids.length > 0;
        eut = eut || estimateTierCellAPI(itemList.length, hasFluid, hasInfinityCell); 
        
        // 验证配方ID格式 
        if (!recipeId || !recipeId.includes(':')) { 
            throw new Error('配方ID格式不正确，应使用 命名空间:路径 格式'); 
        } 
        
        // ========== 默认值系统检查（继承配方默认值系统的启用/禁用逻辑） ==========
        if (!_isCellRecipeEnabled(recipeId, defaultEnabled)) {
            info('[256k Cell API] 配方 ' + recipeId + ' 已被默认值系统禁用，跳过注册');
            return function() { return false; };
        }

        // 生成物品包NBT
        var cellNBT = buildCellNBTCellAPI(itemList, cellName, lore);

        // 解析输入物品
        var parsedInputItems = inputItems.map(parseItemStringCellAPI);
        
        // 解析输入流体 
        var parsedInputFluids = []; 
        if (inputFluids && Array.isArray(inputFluids)) { 
            parsedInputFluids = inputFluids.map(parseFluidStringCellAPI); 
        } 
        
        // 返回一个函数，在 recipes 事件中执行 
        return function(gtceu) { 
            var builder = gtceu.assembler(recipeId); 
            
            // 添加物品输出 
            builder.itemOutputs(Item.of('ae2:portable_item_cell_256k', cellNBT)); 
            
            // 添加物品输入 
            parsedInputItems.forEach(function(item) { 
                builder.itemInputs(Item.of(item.id, item.count)); 
            }); 
            
            // 添加流体输入 
            parsedInputFluids.forEach(function(fluid) { 
                builder.fluidInputs(Fluid.of(fluid.fluid, fluid.amount)); 
            }); 
            
            // 添加电路配置 
            builder.circuit(circuit); 
            
            // 设置时间和功率 
            builder.duration(duration); 
            builder.EUt(eut); 
            
            info('[256k Cell API] 配方已生成: ' + recipeId); 
            info('  物品包: ' + cellName + ' (' + itemList.length + '种物品)'); 
            info('  电压: ' + eut + ' EU/t, 耗时: ' + duration + ' ticks'); 
            info('  电路: ' + circuit + ', 输入物品: ' + inputItems.length + '种');
            
            return true; 
        }; 
        
    } catch (err) { 
        error('[256k Cell API] 配方生成失败 (' + recipeId + '): ' + err.message); 
        return null; 
    } 
}

// 直接注册组装机配方（不需要返回函数，直接执行）
function addCellAssemblerRecipeDirect(recipeId, cellName, itemList, lore, inputItems, inputFluids, circuit, duration, eut, defaultEnabled, gtceu) {
    // 向后兼容：旧调用方式 (..., LV, gtr) 中 defaultEnabled 参数位置实际传的是 gtceu
    if (typeof defaultEnabled === 'object' && defaultEnabled !== null) {
        gtceu = defaultEnabled;
        defaultEnabled = true;
    } else if (defaultEnabled === undefined) {
        defaultEnabled = true;
    } 
    try { 
        // 配方去重检查
        if (_registeredCellRecipes.has(recipeId)) {
            warn('[256k Cell API] 配方 ' + recipeId + ' 已存在，跳过注册');
            return false;
        }
        
        circuit = (circuit !== undefined && circuit !== null) ? circuit : 1; 
        duration = duration || estimateDurationCellAPI(itemList.reduce(function(sum, item) { 
            var parsed = parseItemStringCellAPI(item); 
            return sum + parsed.count; 
        }, 0)); 
        eut = eut || estimateTierCellAPI(itemList.length); 
        
        // 验证配方ID格式 
        if (!recipeId || !recipeId.includes(':')) { 
            throw new Error('配方ID格式不正确，应使用 命名空间:路径 格式'); 
        } 
        
        // ========== 默认值系统检查（继承配方默认值系统的启用/禁用逻辑） ==========
        if (!_isCellRecipeEnabled(recipeId, defaultEnabled)) {
            info("[256k Cell API] 配方 " + recipeId + " 已被默认值系统禁用，跳过注册");
            return false;
        }

        var cellNBT = buildCellNBTCellAPI(itemList, cellName, lore); 
        var parsedInputItems = inputItems.map(parseItemStringCellAPI); 
        
        var builder = gtceu.assembler(recipeId);
        builder.itemOutputs(Item.of('ae2:portable_item_cell_256k', cellNBT));
        parsedInputItems.forEach(function(item) {
            builder.itemInputs(Item.of(item.id, item.count));
        }); 
        
        // 添加流体输入（如果存在）
        if (inputFluids && Array.isArray(inputFluids) && inputFluids.length > 0) {
            var parsedInputFluids = inputFluids.map(parseFluidStringCellAPI); 
            for (var i = 0; i < parsedInputFluids.length; i++) { 
                var fluid = parsedInputFluids[i];
                if (builder.fluidInputs) { 
                    builder.fluidInputs(Fluid.of(fluid.fluid, fluid.amount)); 
                }
            }
        }
        
        builder.circuit(circuit); 
        builder.duration(duration); 
        builder.EUt(eut); 
        
        info(`[256k Cell API] 配方已直接注册: ${recipeId}`); 
        info(`  物品包: ${cellName} (${itemList.length}种物品)`); 
        info(`  电压: ${eut} EU/t, 耗时: ${duration} ticks`); 
        info(`  电路: ${circuit}, 输入物品: ${inputItems.length}种`); 
        
        // 记录已注册的配方ID
        _registeredCellRecipes.add(recipeId);
        return true; 
    } catch (err) { 
        error(`[256k Cell API] 配方直接注册失败 (${recipeId}): ${err.message}`); 
        return false; 
    } 
} 

// ========== 辅助工具函数 ==========

// 解析已生成的物品包内容
function getCellContentCellAPI(cellItem) {
    try {
        if (!cellItem || !cellItem.nbt) {
            return [];
        }
        
        let nbt = cellItem.nbt;
        let result = [];
        
        // 尝试从NBT中提取keys和amts
        if (nbt.keys && nbt.amts && Array.isArray(nbt.keys) && Array.isArray(nbt.amts)) {
            for (let i = 0; i < Math.min(nbt.keys.length, nbt.amts.length); i++) {
                let key = nbt.keys[i];
                let amt = nbt.amts[i];
                
                if (key && key.id) {
                    let count = amt || 1;
                    result.push(`${count}x ${key.id}`);
                }
            }
        }
        
        return result;
        
    } catch (err) {
        error('[256k Cell API] 解析物品包内容失败: ' + err.message);
        return [];
    }
}

// 根据容量类型获取对应的物品ID
function getCellIdByTierCellAPI(tier) {
    let tierMap = {
        '1k': 'ae2:portable_item_cell_1k',
        '4k': 'ae2:portable_item_cell_4k',
        '16k': 'ae2:portable_item_cell_16k',
        '64k': 'ae2:portable_item_cell_64k',
        '256k': 'ae2:portable_item_cell_256k',
        '1M': 'ae2:portable_item_cell_1m',
        '4M': 'ae2:portable_item_cell_4m'
    };
    
    return tierMap[tier] || 'ae2:portable_item_cell_256k';
}

// 检查AE2和GTCEu是否加载
function checkDependenciesCellAPI() {
    return {
        ae2: Platform.isLoaded('ae2'),
        gtceu: Platform.isLoaded('gtceu'),
        allLoaded: Platform.isLoaded('ae2') && Platform.isLoaded('gtceu')
    };
}

// ========== API对象定义 ==========

var CellAPI = {
    // 核心方法
    buildNBT: buildCellNBTCellAPI,
    addAssemblerRecipe: addCellAssemblerRecipeCellAPI,
    addAssemblerRecipeDirect: addCellAssemblerRecipeDirect,
    
    // 辅助方法
    getContent: getCellContentCellAPI,
    estimateTier: estimateTierCellAPI,
    estimateDuration: estimateDurationCellAPI,
    parseItemString: parseItemStringCellAPI,
    parseFluidString: parseFluidStringCellAPI,
    getCellIdByTier: getCellIdByTierCellAPI,
    validateRecipe: validateCellRecipe,
    exportRecipe: exportRecipeToJson,
    checkCompatibility: checkCompatibility,
    measurePerformance: measurePerformance,
    checkDependencies: checkDependenciesCellAPI,
    
    // 批量注册方法
    addBatchRecipes: function(recipes, gtceu) {
        if (!recipes || !Array.isArray(recipes)) {
            throw new Error('recipes 参数必须是一个数组');
        }
        if (!gtceu) {
            throw new Error('gtceu 参数不能为空');
        }
        
        var success = 0, failed = 0;
        recipes.forEach(function(recipe) {
            try {
                var result = addCellAssemblerRecipeDirect(
                    recipe.id, recipe.name, recipe.items, recipe.lore,
                    recipe.inputs || [], recipe.fluids || [], recipe.circuit || 1,
                    recipe.duration, recipe.eut, gtceu
                );
                if (result) {
                    success++;
                } else {
                    failed++;
                }
            } catch (err) {
                error('[256k Cell API] 批量注册配方失败 (' + (recipe.id || '未知') + '): ' + err.message);
                failed++;
            }
        });
        info('[CellAPI] 批量注册完成: 成功 ' + success + ', 失败 ' + failed);
        return { success: success, failed: failed };
    },
    
    // 无限单元格快捷方法
    infinityCell: function(itemString, cellName, lore) {
        // 解析无限单元格格式，如 "expatternprovider:infinity_cell@gtceu:hydrogen"
        if (!itemString || typeof itemString !== 'string') {
            throw new Error('itemString 参数必须是字符串');
        }
        
        // 检查是否为无限单元格格式
        if (!itemString.includes('@')) {
            throw new Error('无限单元格格式必须包含 @ 符号，如 "expatternprovider:infinity_cell@gtceu:hydrogen"');
        }
        
        // 解析物品字符串
        var parsed = parseItemStringCellAPI(itemString);
        if (!parsed) {
            throw new Error('无法解析无限单元格格式: ' + itemString);
        }
        
        // 验证是否为无限单元格
        if (!parsed.id.includes('infinity_cell')) {
            warn('[CellAPI.infinityCell] 警告: 物品ID不包含 "infinity_cell"，但格式包含 @ 符号: ' + itemString);
        }
        
        // 构建NBT标签
        var itemList = [itemString];
        var nbt = buildCellNBTCellAPI(itemList, cellName || '无限单元格', lore || ['§6无限单元格', '§7内部物品: ' + parsed.innerId]);
        
        return nbt;
    },
    
    // 快速添加无限单元格配方
    addInfinityCellRecipe: function(recipeId, infinityCellString, inputItems, inputFluids, circuit, duration, eut, gtceu) {
        // 验证参数
        if (!recipeId || !recipeId.includes(':')) {
            throw new Error('配方ID格式不正确，应使用 命名空间:路径 格式');
        }
        
        if (!infinityCellString || typeof infinityCellString !== 'string') {
            throw new Error('infinityCellString 参数必须是字符串');
        }
        
        if (!infinityCellString.includes('@')) {
            throw new Error('无限单元格格式必须包含 @ 符号，如 "expatternprovider:infinity_cell@gtceu:hydrogen"');
        }
        
        // 解析无限单元格字符串
        var parsed = parseItemStringCellAPI(infinityCellString);
        if (!parsed) {
            throw new Error('无法解析无限单元格格式: ' + infinityCellString);
        }
        
        // 验证是否为无限单元格
        if (!parsed.id.includes('infinity_cell')) {
            warn('[CellAPI.addInfinityCellRecipe] 警告: 物品ID不包含 "infinity_cell"，但格式包含 @ 符号: ' + infinityCellString);
        }
        
        // 生成单元格名称和描述
        var cellName = '无限单元格: ' + (parsed.innerId || '未知');
        var lore = [
            '§6无限单元格',
            '§7内部物品: ' + (parsed.innerId || '未知'),
            '§7数量: 无限'
        ];
        
        // 构建无限单元格列表
        var itemList = [infinityCellString];
        
        // 设置默认值
        circuit = circuit !== undefined ? circuit : 1;
        inputItems = inputItems || [];
        inputFluids = inputFluids || [];
        
        // 估算时间和电压
        duration = duration || estimateDurationCellAPI(9999); // 无限单元格使用高值
        eut = eut || estimateTierCellAPI(1); // 单个物品
        
        // 使用现有的直接注册方法
        var result = addCellAssemblerRecipeDirect(
            recipeId, cellName, itemList, lore,
            inputItems, inputFluids, circuit,
            duration, eut, gtceu
        );
        
        if (result) {
            info('[CellAPI.addInfinityCellRecipe] 无限单元格配方已注册: ' + recipeId + ' (' + infinityCellString + ')');
        }
        
        return result;
    },
    
    // 版本信息
    version: '1.0.0',
    author: '山海恒长在/dishanhai'
};

// 导出到全局
if (typeof global !== 'undefined') {
    global.CellAPI = CellAPI;
    info('[256k Cell API] 已加载，版本 ' + CellAPI.version);
    
    // 检查依赖
    let deps = checkDependenciesCellAPI();
    if (!deps.allLoaded) {
        info('[256k Cell API] 缺少依赖:');
        if (!deps.ae2) info('  - AE2未加载');
        if (!deps.gtceu) info('  - GTCEu未加载');
    } else {
        info('[256k Cell API] 所有依赖已满足');
    }
}

// ========== 热重载支持 ==========

// 支持/kubejs reload startup_scripts后重新注册API
if (global.__kubejs_cell_api_reload_count === undefined) {
    global.__kubejs_cell_api_reload_count = 0;
}
global.__kubejs_cell_api_reload_count++;

info('[256k Cell API] 热重载次数: ' + global.__kubejs_cell_api_reload_count);

// ========== getShanhaiPackNBT, packed_cell_nbt2, DShanhaiSDA 已在文件顶部定义并导出 ==========

//此外不允许再添加配方
// ========== 玩家登录通知 ==========
PlayerEvents.loggedIn(event => {
    let player = event.player;
    event.server.scheduleInTicks(160, () => {
        DShanhaiRecipeEngine.sendRecipeStatsToPlayer(player, Version, API_Version);
    });
});

// 配方查找函数
function getArrayName(arr) {
    // 通过全局变量查找数组名称（安全实现）
    if (!arr) return 'unknown';
    if (global.assrecipes && arr === global.assrecipes) return 'assrecipes';
    if (global.universalRecipes && arr === global.universalRecipes) return 'universalRecipes';
    if (global.suprecipes_1 && arr === global.suprecipes_1) return 'suprecipes_1';
    if (global.recipes_voidfluxs && arr === global.recipes_voidfluxs) return 'recipes_voidfluxs';
    if (global.dishanhairecipes && arr === global.dishanhairecipes) return 'dishanhairecipes';
    if (global.recipes && arr === global.recipes) return 'recipes';
    if (global.recipes_electrolyzers && arr === global.recipes_electrolyzers) return 'recipes_electrolyzers';
    return 'unknown';
}

function getRecipeDetails(recipe) {
    if (!recipe) return '无配方信息';
    let details = 'ID: ' + recipe.id + '\n类型: ' + recipe.type + '\n';
    if (recipe.itemInputs) details += '物品输入: ' + JSON.stringify(recipe.itemInputs) + '\n';
    if (recipe.inputFluids) details += '流体输入: ' + JSON.stringify(recipe.inputFluids) + '\n';
    if (recipe.itemOutputs) details += '物品输出: ' + JSON.stringify(recipe.itemOutputs) + '\n';
    if (recipe.outputFluids) details += '流体输出: ' + JSON.stringify(recipe.outputFluids) + '\n';
    if (recipe.EUt !== undefined) details += 'EU/t: ' + recipe.EUt + '\n';
    if (recipe.duration !== undefined) details += '耗时: ' + recipe.duration + '\n';
    if (recipe.circuit !== undefined) details += '电路: ' + recipe.circuit + '\n';
    if (recipe.notConsumable !== undefined) details += '非消耗品: ' + recipe.notConsumable + '\n';
    return details;
}

function getErrorDetails(index) {
    if (!global.shanhaiRecipeStats || !global.shanhaiRecipeStats.errors) {
        return null;
    }
    if (index < 0 || index >= global.shanhaiRecipeStats.errors.length) {
        return null;
    }
    return global.shanhaiRecipeStats.errors[index];
}



// ========== 脚本加载完成事件 ==========
// ========== 配置持久化修复（外部作用域） ==========
var CONFIG_PATH = 'kubejs/data/shanhai_recipe_load_config.json';

function saveConfigToFile(config) {
    try {
        if (typeof JsonIO !== 'undefined' && typeof JsonIO.write === 'function') {
            JsonIO.write(CONFIG_PATH, config);
            console.log('§a[配置修复] 配置已保存: ' + Object.keys(config).length + ' 个条目');
            return true;
        }
    } catch (err) {
        console.log('§c[配置修复] 保存配置失败: ' + err.message);
    }
    return false;
}

// ========== 配置持久化周期保存 ==========
ServerEvents.tick(function(ev) {
    if (ev.server.tick % 6000 === 0 && ev.server.tick > 0) {
        if (typeof global !== 'undefined' && global.shanhaiRecipeLoadConfig && 
            Object.keys(global.shanhaiRecipeLoadConfig).length > 0) {
            saveConfigToFile(global.shanhaiRecipeLoadConfig);
        }
    }
});

ServerEvents.loaded(event => {
    // 1. 初始化保护（延迟执行，确保其他脚本已加载）
    event.server.scheduleInTicks(20, function() { initializeProtection(); });
    
    // ========== 配置持久化修复（已禁用） ==========
    (function() {
        return; // 禁用配置持久化修复


        function collectRecipeDefaultsFromCollector() {
            var recipeDefaults = {};
            var collector = global.shanhaiRecipeCollector || global.shanhaiRecipeInfoCollector;
            
            if (!collector || typeof collector !== 'object') {
                console.log('§e[配置修复] 配方收集器不存在');
                return null;
            }
            
            var totalKeys = Object.keys(collector).length;
            console.log('§7[配置修复] 收集器总键数: ' + totalKeys);
            
            var count = 0;
            for (var key in collector) {
                if (collector.hasOwnProperty(key) && key !== '_statistics') {
                    var info = collector[key];
                    // ⚠️ 修改：不要设置默认值，只记录已明确设置的
                    if (info && typeof info.defaultEnabled !== 'undefined') {
                        recipeDefaults[key] = info.defaultEnabled === true;
                        count++;
                    }
                    // 如果没有明确设置 defaultEnabled，不添加到默认值列表
                }
            }
            
            console.log('§a[配置修复] 从收集器获取到 ' + count + ' 个配方默认值');
            return recipeDefaults;
        }
        
        function syncAllRecipesToConfig(forceOverwrite) {
            // 忽略 forceOverwrite 参数，永远不覆盖用户配置
            
            console.log('§6[配置修复] 开始同步所有配方到配置文件...');
            
            if (typeof global !== 'undefined' && global.shanhaiRecipeConfigJustReset === true) {
                console.log('§e[配置修复] 检测到重置标志，跳过同步');
                return false;
            }
            
            var allDefaults = collectRecipeDefaultsFromCollector();
            if (!allDefaults || Object.keys(allDefaults).length === 0) {
                console.log('§e[配置修复] 收集器为空，无法同步');
                return false;
            }
            
            var existingConfig = {};
            try {
                if (typeof JsonIO !== 'undefined' && typeof JsonIO.read === 'function') {
                    existingConfig = JsonIO.read(CONFIG_PATH) || {};
                }
            } catch (e) { }
            
            var finalConfig = {};
            var addedCount = 0;
            var skippedCount = 0;
            
            // 先复制现有配置（用户设置优先）
            for (var key in existingConfig) {
                if (existingConfig.hasOwnProperty(key) && typeof existingConfig[key] === 'boolean') {
                    finalConfig[key] = existingConfig[key];
                }
            }
            
            // 只添加缺失的配方（用户未设置过的）
            for (var key in allDefaults) {
                if (allDefaults.hasOwnProperty(key)) {
                    if (finalConfig[key] === undefined) {
                        finalConfig[key] = allDefaults[key];
                        addedCount++;
                        console.log('§7[配置修复] 添加新配方: ' + key + ' = ' + (allDefaults[key] ? '启用' : '禁用'));
                    } else {
                        skippedCount++;
                        // 已存在配置，保留用户设置，不覆盖
                    }
                }
            }
            
            console.log('§a[配置修复] 新增 ' + addedCount + ' 个配方，保留 ' + skippedCount + ' 个用户配置');
            
            if (addedCount > 0) {
                saveConfigToFile(finalConfig);
            } else {
                console.log('§a[配置修复] 配置已是最新，共 ' + Object.keys(finalConfig).length + ' 个配方');
            }
            
            if (typeof global !== 'undefined') {
                global.shanhaiRecipeLoadConfig = finalConfig;
            }
            
            return true;
        }
        
        var attempts = 0;
        var maxAttempts = 30;
        
        function trySync(e) {
            attempts++;
            console.log('§7[配置修复] 尝试同步配方 (第 ' + attempts + '/' + maxAttempts + ' 次)');
            
            var collector = global.shanhaiRecipeCollector || global.shanhaiRecipeInfoCollector;
            var collectorSize = collector ? Object.keys(collector).filter(function(k) { return k !== '_statistics'; }).length : 0;
            
            if (collectorSize > 0) {
                console.log('§a[配置修复] 收集器已有 ' + collectorSize + ' 个配方');
                
                if (global.shanhaiRecipeConfigJustReset === true) {
                    console.log('§e[配置修复] 检测到重置标志，跳过同步');
                    delete global.shanhaiRecipeConfigJustReset;
                    return;
                }
                
                syncAllRecipesToConfig(false);
            } else if (attempts < maxAttempts) {
                e.server.scheduleInTicks(60, function() { trySync(e); });
            } else {
                console.log('§e[配置修复] 达到最大尝试次数，收集器仍为空');
            }
        }
        
        console.log('§6[配置修复] 配置持久化修复已加载');
        event.server.scheduleInTicks(200, function() { trySync(event); });
        

    })();
    // ========== 配置持久化修复结束 ==========
    
    syncStatsToGlobal();
    
    // 导出配方数组到全局对象，供API访问
    if (typeof assrecipes !== 'undefined') global.assrecipes = assrecipes;
    if (typeof universalRecipes !== 'undefined') global.universalRecipes = universalRecipes;
    if (typeof suprecipes_1 !== 'undefined') global.suprecipes_1 = suprecipes_1;
    if (typeof recipes_voidfluxs !== 'undefined') global.recipes_voidfluxs = recipes_voidfluxs;
    if (typeof dishanhairecipes !== 'undefined') global.dishanhairecipes = dishanhairecipes;
    if (typeof recipes !== 'undefined') global.recipes = recipes;
    if (typeof recipes_electrolyzers !== 'undefined') global.recipes_electrolyzers = recipes_electrolyzers;
    info('配方数组已导出到全局对象 (ServerEvents.loaded)');
    
    // 检查配方控制API状态
    if (global.shanhaiRecipeControlAPI && typeof global.shanhaiRecipeControlAPI.getVersion === 'function') {
        try {
            var version = global.shanhaiRecipeControlAPI.getVersion();
            info(`§a✓ 配方控制API已加载 (v${version})`);
        } catch(err) {
            info(`§e⚠ 配方控制API加载异常: ${err.message}`);
        }
    } else if (global.shanhaiRecipeControlAPI) {
        info(`§e⚠ 配方控制API已加载 (无版本信息)`);
    } else {
        info(`§e⚠ 配方控制API未加载，配方加载控制将使用默认行为`);
    }
    
    // ==================== 山海私货 · 主脚本保护 ====================
    if (global.__shanhai_guard__) {
        var guard = global.__shanhai_guard__;

        // 密封主要API
        if (global.shanhaiAPI) {
            guard.sealAPI(global.shanhaiAPI, 'shanhaiAPI');
            info('§6[山海保护层] §a主API已施加封印保护§r');
        }
        if (global.shanhaiRecipeAPI) {
            guard.sealAPI(global.shanhaiRecipeAPI, 'shanhaiRecipeAPI');
            info('§6[山海保护层] §a配方API已施加封印保护§r');
        }
        if (global.shanhaiRecipeControlAPI) {
            guard.sealAPI(global.shanhaiRecipeControlAPI, 'shanhaiRecipeControlAPI');
            info('§6[山海保护层] §a配方控制API已施加封印保护§r');
        }
    }
    
    info(`§6═══════════════════════════════════════════════════════════§r`);
    info(`§a✨ 山海的big私货 加载完成！§r`);
    info(`§6═══════════════════════════════════════════════════════════§r`);
    info(`§b📋 山海私货脚本框架加载完成§r`);
    info(`§6═══════════════════════════════════════════════════════════§r`);
    
});
})();
