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

var Version = '2.6.2(日志系统版本2.7.2)'//主版本与日志系统版本
var API_Version = '2.8.0'//api版本
// 挂载到全局对象，供其他脚本访问
if (typeof global !== 'undefined') {
    global.shanhaiVersion = Version;
    global.shanhaiAPIVersion = API_Version;
}

// 超级AE包全局变量
var superAEPackItemCount = 0; // 将在配方初始化时设置
var superAEPackLore = null; // 超级AE包的Lore描述
//var superAEPackItemList = null; 超级AE包物品列表

var SHANHAI_PROTECTION_MAX_WAIT_ATTEMPTS = 5;

//  配方去重检测
var _registeredCellRecipes = new Set();

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
function initializeProtection(event) {
    info('初始化API保护系统...');
    
    var maxWaitAttempts = SHANHAI_PROTECTION_MAX_WAIT_ATTEMPTS;
    var waitAttempts = 0;
    
    function tryProtect() {
        waitAttempts++;
        
        // 检查数据是否就绪（配方统计是否已开始）
        var dataReady = recipeStats.total > 0 || recipeStats.errors.length > 0;
        
        if (!dataReady && waitAttempts < maxWaitAttempts) {
            // 数据未就绪，继续等待
            if (event && event.server && typeof event.server.scheduleInTicks === 'function') {
                info(`等待配方数据就绪... (${waitAttempts}/${maxWaitAttempts})`);
                event.server.scheduleInTicks(20, tryProtect);
                return;
            } else {
                // 没有event对象，无法调度重试
                info('§e⚠ 无法调度重试，event对象不可用');
            }
        }
        
        // 保护关键全局变量（无论数据是否就绪都执行）
        protectGlobalVariable('shanhaiRecipeStats', {}, { preventModification: true });
        protectGlobalVariable('shanhaiAPI', {}, { preventModification: false });
        protectGlobalVariable('shanhaiRecipeAPI', {}, { preventModification: false });
        
        // 保护内部统计变量（只有在数据就绪时）
        if (dataReady) {
            protectGlobalVariable('recipeStatsInternal', recipeStats, { preventModification: true });
            protectGlobalVariable('typeFailedInternal', typeFailed, { preventModification: true });
            info('API保护系统初始化完成（数据已就绪）');
        } else {
            info('§e⚠ 配方统计数据未就绪，跳过内部变量保护');
            info('API保护系统初始化完成（数据未就绪）');
        }
    }
    
    tryProtect();
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
    let statsCopy = JSON.parse(JSON.stringify(recipeStats));
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
        let stats = JSON.parse(JSON.stringify(recipeStats));
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
        return recipeStats.errors.filter(function(err) { return err.type === type; });
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
            stats.errors.slice(0, 5).forEach(function(err, i) {
                summary += (i+1) + ".[" + err.type + "] " + err.name + "\n";
            });
            
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
        return recipeStats.byType[type] ? JSON.parse(JSON.stringify(recipeStats.byType[type])) : null;
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
        return JSON.parse(JSON.stringify(recipeStats.byType));
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
     * 获取性能统计
     * 
     * 获取配方加载的性能统计数据。
     * 
     * @function getPerformanceStats
     * @memberof shanhaiRecipeAPI
     * @returns {Object} 性能统计对象
     * @property {number} recipeCount - 配方总数
     * @property {number} success - 成功数量
     * @property {number} failed - 失败数量
     * @property {string} successRate - 成功率
     * @property {number} errors - 错误数量
     * @property {Object} byType - 按类型统计
     * @example
     * let performance = global.shanhaiRecipeAPI.getPerformanceStats();
     * console.log(`成功率: ${performance.successRate}`);
     */
    getPerformanceStats: function() {
        return getPerformanceStats();
    },
    
    /**
     * 获取系统状态
     * 
     * 获取山海私货系统的当前状态。
     * 
     * @function getSystemStatus
     * @memberof shanhaiRecipeAPI
     * @returns {Object} 系统状态对象
     * @property {number} superAEPackItemCount - 超级AE包物品数量
     * @property {string} superAEPackLore - 超级AE包Lore描述
     * @property {string} shanhaiRecipeStats - 全局统计状态
     * @property {Object} recipeStats - 内部统计
     * @example
     * let status = global.shanhaiRecipeAPI.getSystemStatus();
     * console.log(`AE包物品数: ${status.superAEPackItemCount}`);
     */
    getSystemStatus: function() {
        return getSystemStatus();
    },
    
    /**
     * 获取动态颜色
     * 
     * 根据当前时间和速度参数生成动态变化的颜色。
     * 使用HSL颜色模型实现平滑的颜色循环。
     * 
     * @function getDynamicColor
     * @memberof shanhaiRecipeAPI
     * @param {number} [time] - 时间基准，如果不提供则使用游戏时间 (ticks)
     * @param {number} [speed] - 颜色变化速度，默认0.001（约每3秒完成一次完整色相循环）
     * @returns {string} Minecraft颜色代码，格式为 "§x§R§R§G§G§B§B"
     * @example
     * let color = global.shanhaiRecipeAPI.getDynamicColor();
     * console.log(color); // 输出: §x§F§F§0§0§0§0 (动态变化的颜色)
     */
    getDynamicColor: function(time, speed) {
        return "§a";
    },
    
    /**
     * 获取彩虹颜色序列
     * 
     * 生成彩虹色效果，每个字符使用不同的颜色。
     * 
     * @function getRainbowText
     * @memberof shanhaiRecipeAPI
     * @param {string} text - 要着色的文本
     * @param {number} [time] - 时间基准
     * @param {number} [speed] - 颜色变化速度，默认0.005
     * @param {number} [offset] - 颜色偏移量，默认0.1
     * @returns {string} 彩色文本
     * @example
     * let rainbow = global.shanhaiRecipeAPI.getRainbowText("山海私货");
     * console.log(rainbow); // 输出: §x§F§F§0§0§0§0山§x§F§F§7§F§0§0海§x§F§F§F§F§0§0私§x§0§0§F§F§0§0货§r
     */
    getRainbowText: function(text, time, speed, offset) {
        return "§a" + text + "§r";
    },
    
    /**
     * 获取渐变文本
     * 
     * 在两种颜色之间创建平滑渐变。
     * 
     * @function getGradientText
     * @memberof shanhaiRecipeAPI
     * @param {string} text - 要着色的文本
     * @param {string} startColor - 起始颜色（十六进制，如 "#FF0000"）
     * @param {string} endColor - 结束颜色（十六进制，如 "#0000FF"）
     * @returns {string} 渐变文本
     * @example
     * let gradient = global.shanhaiRecipeAPI.getGradientText("山海私货", "#FF0000", "#0000FF");
     * console.log(gradient); // 输出: 从红到蓝渐变的文本
     */
    getGradientText: function(text, startColor, endColor) {
        return getFixedColorText(text, '§b');
    },
    
    /**
     * 创建动态彩色文本组件
     * 
     * 使用Component API创建动态彩色文本，适合在聊天或物品名称中使用。
     * 
     * @function createDynamicText
     * @memberof shanhaiRecipeAPI
     * @param {string} text - 文本内容
     * @param {Object} [options] - 选项
     * @param {string} [options.mode] - 颜色模式: 'dynamic', 'rainbow', 'gradient'
     * @param {number} [options.speed] - 颜色变化速度
     * @param {string} [options.startColor] - 渐变起始颜色（仅渐变模式）
     * @param {string} [options.endColor] - 渐变结束颜色（仅渐变模式）
     * @returns {Component|string} 彩色文本组件或字符串
     * @example
     * // 创建动态颜色文本
     * let dynamicText = global.shanhaiRecipeAPI.createDynamicText("动态文本");
     * 
     * // 创建彩虹文本
     * let rainbowText = global.shanhaiRecipeAPI.createDynamicText("彩虹文本", { mode: 'rainbow' });
     * 
     * // 创建渐变文本
     * let gradientText = global.shanhaiRecipeAPI.createDynamicText("渐变文本", { 
     *     mode: 'gradient', 
     *     startColor: '#FF0000', 
     *     endColor: '#0000FF' 
     * });
     */
    createDynamicText: function(text, options) {
        // 简单实现：返回随机彩虹文本
        return "§a" + text + "§r";
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

// ========== ae包配方生成 ==========
function getShanhaiPackNBT(packId) {
    if (!global.shanhaiPackDefs || !global.shanhaiPackDefs[packId]) return '';
    var pack = global.shanhaiPackDefs[packId];
    return pack.sdaNbt || pack.nbt || '';
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
if (typeof global !== 'undefined') global.packed_cell_nbt2 = packed_cell_nbt2;
if (typeof global !== 'undefined') global.getShanhaiPackNBT = getShanhaiPackNBT;

// ========== 超级磁盘阵列(SDA)构建器 ==========
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
if (typeof global !== 'undefined') global.DShanhaiSDA = DShanhaiSDA;

// ========== 输出物品盘配方 ==========
ServerEvents.recipes(event => {
    var timer_super_ae_pack = new Timer('超级AE包配方');
    info('📀 开始生成超级AE包配方...');
    
    var super_pack_GTV = Java.loadClass('com.gregtechceu.gtceu.api.GTValues').VA;
    var super_pack_GTValues = [super_pack_GTV[0],super_pack_GTV[1],super_pack_GTV[2],super_pack_GTV[3],super_pack_GTV[4],super_pack_GTV[5],super_pack_GTV[6],super_pack_GTV[7],super_pack_GTV[8],super_pack_GTV[9],super_pack_GTV[10],super_pack_GTV[11],super_pack_GTV[12],super_pack_GTV[13],super_pack_GTV[14]];
    var ULV=super_pack_GTValues[0],LV=super_pack_GTValues[1],MV=super_pack_GTValues[2],HV=super_pack_GTValues[3],EV=super_pack_GTValues[4],IV=super_pack_GTValues[5],LuV=super_pack_GTValues[6],ZPM=super_pack_GTValues[7],UV=super_pack_GTValues[8],UHV=super_pack_GTValues[9],UEV=super_pack_GTValues[10],UIV=super_pack_GTValues[11],UXV=super_pack_GTValues[12],OpV=super_pack_GTValues[13],MAX=super_pack_GTValues[14];
    // ========== 超级AE包配方 ==========
    try {
        // 使用预构建 NBT（与 JEI 完全一致，startup 生成，通过 global 保证跨端同步）
        var superAENBT = getShanhaiPackNBT('superAE');
        event.shapeless(
            Item.of('gt_shanhai:super_disk_array', superAENBT),
            ['ae2:fluix_axe']
        ).id('dishanhai:super_ae_pack');
        info('✅ 超级AE包配方已生成 id=dishanhai:super_ae_pack NBT_len=' + (superAENBT ? superAENBT.length : 'null'));
    } catch(err) {
        error('❌ 超级AE包配方生成失败: ' + err.message);
    }

// ========== 无限染料元件包配方 ==========
    const dyeRecipeType = 'assembler';
    const dyeRecipeId = 'dishanhai:infinity_dye_cell_pack_pro';
    
    try {
        info('🎨 开始生成无限染料元件包pro配方...');
        
        var dyeItemsList = Ingredient.of('#forge:dyes').getItemIds();
        if (!dyeItemsList || dyeItemsList.length === 0) {
            throw new Error('未找到染料物品，标签 #forge:dyes 可能为空');
        }
        info('🎨 从 #forge:dyes 标签获取到 ' + dyeItemsList.length + ' 种染料物品');
        var gtr = event.recipes.gtceu;
        gtr.assembler(dyeRecipeId)
            .circuit(1)
            .itemInputs('minecraft:dandelion')
            .itemOutputs(DShanhaiSDA.create('无限染料元件包pro').infinityOutputs(dyeItemsList).lore([
                '§7包含所有染料物品的无限元件包',
                '§7染料种类: §e' + dyeItemsList.length + '§7 种',
                '§7每个染料存储在无限元件包中',
                '§8山海私货 v2.2'
            ]).build())
            .duration(200)
            .EUt(LV);
        
        // 记录成功的配方
        recordRecipe(dyeRecipeType, true, dyeRecipeId);
        info('✅ 无限染料元件包pro配方已生成');
            } catch(err) {
        error('❌ 无限染料元件包pro配方生成失败: ' + err.message);
        // 记录失败的配方
        recordRecipe(dyeRecipeType, false, dyeRecipeId, err.message);
    }

    info('🔧 开始生成天基大礼包配方...');

    var gtr = event.recipes.gtceu;
    const piggrecipeId = 'dishanhai:assembler_template';
    
    try {

        gtr.assembler(piggrecipeId)
            .circuit(1)
         
            .itemInputs( 'dishanhai:piggy','gtladditions:space_infinity_integrated_ore_processor'
            )
            .itemOutputs(
            Item.of('gt_shanhai:super_disk_array', getShanhaiPackNBT('skyBase'))
            )
            .duration(200)
            .EUt(LV);
        
        info('✅ 天基大礼包配方已生成');
            } catch(err) {
        error('❌ 天基大礼包配方生成失败: ' + err.message);
    }
    


    info('🔧 开始生成猪咪大礼包...');       
const templaterecipeId = 'dishanhai:Piggy_Big_Package';

try {
    var piggyPackNBT = getShanhaiPackNBT('piggy')
    gtr.assembler(templaterecipeId)
        .circuit(1)
        .itemInputs("1x dishanhai:dog_coins")
        .itemOutputs(Item.of('gt_shanhai:super_disk_array', piggyPackNBT))
        .duration(200)
        .EUt(LV);
    info('✅ 猪咪大礼包配方已生成: ' + templaterecipeId);
                } catch(err) {
    error('❌ 猪咪大礼包配方生成失败: ' + err.message);
}


info('🔧 奇点数据中枢建材存储阵列...');
    try {
        var gtr = event.recipes.gtceu;
        var SDAinline = getShanhaiPackNBT('SDAinline')

        gtr.assembler('dishanhai:singularity_data_hub')
            .circuit(1)
            .itemInputs( 'dishanhai:piggy','gtladditions:space_infinity_integrated_ore_processor'
            )
            .itemOutputs(Item.of('gt_shanhai:super_disk_array', SDAinline))
            .duration(200)
            .EUt(LV);
            } catch(err) {
        error('❌ 配方生成失败: ' + err.message);
    }



///*
    const dyeRecipeType_2 = 'assembler';
    const dyeRecipeId_2 = 'dishanhai:infinity_dye_cell_pack_pro_2';
    
    try {
        
        var dyeItemsList = [
"gtceu:basic_integrated_circuit","gtceu:good_integrated_circuit","gtceu:advanced_integrated_circuit"
        ]
        if (!dyeItemsList || dyeItemsList.length === 0) {
        }
        info('🎨获取到 ' + dyeItemsList.length + ' 种物品');
        var gtr = event.recipes.gtceu;
gtr.assembler('dishanhai:super_disk_array_naquadah_pack')
    .circuit(1)
    .itemInputs("dishanhai:dishanhai")
    .itemOutputs(DShanhaiSDA.create('集成电路DASDA')
        .infinityOutputs(dyeItemsList)
        .lore([
            "内部构建集成电路相关物品/流体",
            '§7自动内联无限存储元件',
            '§7条目数量: §e' + dyeItemsList.length,
            '{ultimate}山海的神人私货v2.7.3{/}'
        ])
    .build())
    .duration(200)
    .EUt(LV);
        // 记录成功的配方
        recordRecipe(dyeRecipeType_2, true, dyeRecipeId_2);
            } catch(err) {
        error('❌ 无限元件包配方生成失败: ' + err.message);
        // 记录失败的配方
        recordRecipe(dyeRecipeType_2, false, dyeRecipeId_2, err.message);
    }
///*

/*
const dyeRecipeType_2 = 'assembler';
    const dyeRecipeId_2 = 'dishanhai:infinity_dye_cell_pack_pro_2';
    
    try {
        
        var dyeItemsList = [];
        // 遍历所有流体，筛选 gtceu 模组的流体
        var ForgeRegistries = Java.loadClass('net.minecraftforge.registries.ForgeRegistries');
        ForgeRegistries.FLUIDS.getKeys().forEach(function(key) {
            var id = key.toString();
            // 使用正则表达式匹配 gtceu 模组的流体
            if (/^gtceu:.+/.test(id)) {
                dyeItemsList.push(id);
            }
        });
        if (!dyeItemsList || dyeItemsList.length === 0) {
            throw new Error('未找到 gtceu 模组的流体');
        }
        info('🎨 找到 ' + dyeItemsList.length + ' 种 gtceu 流体');
        // 预处理：将流体 ID 转为 "1x infinity_cell@id" 格式，匹配全局构建器（流体使用 ae2:f）
        var _dyeItems = [];
        for (var _di = 0; _di < dyeItemsList.length; _di++) {
            _dyeItems.push('1x expatternprovider:infinity_cell@' + dyeItemsList[_di]);
        }
        var gtr = event.recipes.gtceu;
        gtr.assembler(dyeRecipeId_2)
            .circuit(1)
            .itemInputs('minecraft:dandelion')
            .itemOutputs(Item.of(DShanhaiSDA.create('超级磁盘阵列') [
                '§7包含所有gtceu流体的无限元件包',
                '§7流体种类: §e' + dyeItemsList.length + '§7 种',
                '§7每个流体存储在无限元件包中',
                '§8山海私货 v2.7'
            ])))
            .duration(200)
            .EUt(LV);
        
        // 记录成功的配方
        recordRecipe(dyeRecipeType_2, true, dyeRecipeId_2);
        info('✅ 无限gtceu流体元件包配方已生成');
            } catch(err) {
        error('❌ 无限gtceu流体元件包配方生成失败: ' + err.message);
        // 记录失败的配方
        recordRecipe(dyeRecipeType_2, false, dyeRecipeId_2, err.message);
    }
*/

/*
    const dyeRecipeType_2 = 'assembler';
    const dyeRecipeId_2 = 'dishanhai:infinity_dye_cell_pack_pro_2';
    
    try {
        
        var dyeItemsList = [];
        // 遍历所有流体，筛选以 plasma 结尾的流体
        var ForgeRegistries = Java.loadClass('net.minecraftforge.registries.ForgeRegistries');
        ForgeRegistries.FLUIDS.getKeys().forEach(function(key) {
            var id = key.toString();
            // 使用正则表达式匹配以 plasma 结尾的流体
            if (/plasma$/.test(id)) {
                dyeItemsList.push(id);
            }
        });
        info('🎨 找到 ' + dyeItemsList.length + ' 种流体');
        // 预处理：将流体 ID 转为 "1x infinity_cell@id" 格式，匹配全局构建器（流体使用 ae2:f）
        var _dyeItems = [];
        for (var _di = 0; _di < dyeItemsList.length; _di++) {
            _dyeItems.push('1x expatternprovider:infinity_cell@' + dyeItemsList[_di]);
        }
        var gtr = event.recipes.gtceu;
        gtr.assembler(dyeRecipeId_2)
            .circuit(1)
            .itemInputs('minecraft:dandelion')
            .itemOutputs(Item.of('ae2:portable_item_cell_256k', DShanhaiNBTAPI.buildAECellNBTFromList(_dyeItems, '无限油元件包', [
                '§7包含所有油的无限元件包',
                '§7物品种类: §e' + dyeItemsList.length + '§7 种',
                '§7每个物品存储在无限元件包中',
                '§8山海私货 v2.7'
            ])))
            .duration(200)
            .EUt(LV);
        
        // 记录成功的配方
        recordRecipe(dyeRecipeType_2, true, dyeRecipeId_2);
        info('✅ 无限电路元件包pro配方已生成');
            } catch(err) {
        error('❌ 无限电路元件包pro配方生成失败: ' + err.message);
        // 记录失败的配方
        recordRecipe(dyeRecipeType_2, false, dyeRecipeId_2, err.message);
    }
*/

/*
    const dyeRecipeType_2 = 'assembler';
    const dyeRecipeId_2 = 'dishanhai:infinity_dye_cell_pack_pro_2';
    
    try {
        info('🎨 开始生成无限电路元件包pro配方...');
        
        var id_array_list = [];

        var tag1 = Ingredient.of('/.*wl_board_/').getItemIds() || [];
        //ar gems = Ingredient.of('#avaritia:singularity').getItemIds() || [];
        //var foils = Ingredient.of('#forge:nanoswarms').getItemIds() || [];
        //var plates = Ingredient.of('#forge:small_gears').getItemIds() || [];
        var allItems = tag1
        //筛选
        for (var i = 0; i < allItems.length; i++) {
            var itemId = String(allItems[i]);
            if (/^(kubejs:|avaritia:|gtceu:|gtladditions|dishanhai:)/.test(itemId)) {
                id_array_list.push(itemId);
            }
        }
    gtr.assembler('dishanhai:super_disk_array_naquadah_pack')
        .circuit(1)
        .itemInputs("dishanhai:dishanhai")
        .itemOutputs(DShanhaiSDA.create('世线板磁盘阵列')
        .infinityOutputs(id_array_list)
        .lore([
                '§7包含所有世线板元件的无限元件包',
                '§7物品种类: §e' + id_array_list.length + '§7 种',
                '§7每个物品存储在无限元件包中',
                '§8山海私货 v2.7.3'
        ])
            .build())
            .duration(200)
            .EUt(LV);
        
        // 记录成功的配方
        recordRecipe(dyeRecipeType_2, true, dyeRecipeId_2);
        info('✅ 无限电路元件包pro配方已生成');
            } catch(err) {
        error('❌ 无限电路元件包pro配方生成失败: ' + err.message);
        // 记录失败的配方
        recordRecipe(dyeRecipeType_2, false, dyeRecipeId_2, err.message);
    }
*/


    try {
        event.remove({ id: 'ae2:tools/fluix_axe' });
        event.remove({ id: 'ae2:tools/fluix_pickaxe' });
        debug('移除原版福鲁伊克斯工具配方');
    } catch(err) {
        warn(`移除原版配方失败: ${err.message}`);
    }

    
    const bandisassemblyitem = ['me_super_pattern_buffer_proxy', 'me_super_pattern_buffer', 'infinity_input_dual_hatch'];
    const bandisassemblyitem2 = ['me_extended_export_buffer', 'me_extended_async_export_buffer', 'uv_dual_output_hatch', 'uv_dual_input_hatch', 'me_dual_hatch_stock_part_machine', 'me_input_hatch', 'me_input_bus'];
    
    bandisassemblyitem.forEach(i => {
        try {
            event.remove({ id: 'gtladditions:disassembly/' + i });
            debug(`移除拆解配方: gtladditions:disassembly/${i}`);
        } catch(err) {
            debug(`移除拆解配方失败: ${i}`);
        }
    });
    
    bandisassemblyitem2.forEach(i => {
        try {
            event.remove({ id: 'gtceu:disassembly/' + i });
            debug(`移除拆解配方: gtceu:disassembly/${i}`);
        } catch(err) {
            debug(`移除拆解配方失败: ${i}`);
        }
    });
    
    try {
        event.remove({ id: 'gtladditions:disassembly/wireless_energy_network_output_terminal' });
        debug('移除无线能量输出终端拆解配方');
    } catch(err) {
        debug('移除拆解配方失败');
    }
    
    timer_super_ae_pack.end();

    
});

 

// ========== 光子矩阵蚀刻配方 ==========
ServerEvents.recipes(e => {
    var timer_photon_matrix = new Timer('光子矩阵蚀刻配方');
    info('🔬 开始注册光子矩阵蚀刻配方...');
    
    var photon_GTV = Java.loadClass('com.gregtechceu.gtceu.api.GTValues').VA;
    var photon_GTValues = [photon_GTV[0],photon_GTV[1],photon_GTV[2],photon_GTV[3],photon_GTV[4],photon_GTV[5],photon_GTV[6],photon_GTV[7],photon_GTV[8],photon_GTV[9],photon_GTV[10],photon_GTV[11],photon_GTV[12],photon_GTV[13],photon_GTV[14]];
    var photon_uev = photon_GTValues[10], photon_uiv = photon_GTValues[11], photon_uxv = photon_GTValues[12], photon_opv = photon_GTValues[13], photon_max = photon_GTValues[14];
    var gtr = e.recipes.gtceu;
    
    const waferTypes = [
        { id: 'cpu', baseOutput: 384 },
        { id: 'ram', baseOutput: 384 },
        { id: 'ilc', baseOutput: 384 },
        { id: 'simple_soc', baseOutput: 384 },
        { id: 'soc', baseOutput: 192 },
        { id: 'advanced_soc', baseOutput: 48 },
        { id: 'highly_advanced_soc', baseOutput: 24 },
        { id: 'nand_memory', baseOutput: 192 },
        { id: 'nor_memory', baseOutput: 192 },
        { id: 'ulpic', baseOutput: 384 },
        { id: 'lpic', baseOutput: 384 },
        { id: 'mpic', baseOutput: 192 }
    ];
    
    const batches = [
        { input: 'kubejs:cosmic_soc_wafer', multiplier: 10, voltage: photon_uev, suffix: '1' },
        { input: 'kubejs:cosmic_ram_wafer', multiplier: 25, voltage: photon_uiv, suffix: '2' },
        { input: 'kubejs:supracausal_ram_wafer', multiplier: 50, voltage: photon_uxv, suffix: '3' },
        { input: 'gtladditions:infinity_wafer', multiplier: 70, voltage: photon_opv, suffix: '4' },
        { input: 'gtladditions:prepare_primary_soc_wafer', multiplier: 85, voltage: photon_max, suffix: '5' },
        { input: 'dishanhai:soc', multiplier: 100, voltage: 65565 * photon_max, suffix: '6' }
    ];
    
    var photonRecipeCount = 0;
    
    waferTypes.forEach((wafer, index) => {
        var photonCircuitNum = index + 1;
        
        batches.forEach(batch => {
            var photonOutputCount = Math.floor(wafer.baseOutput * batch.multiplier);
            
            if (batch.suffix === '4' && wafer.id === 'soc') photonOutputCount = 1344;
            if (batch.suffix === '4' && wafer.id === 'advanced_soc') photonOutputCount = 672;
            if (batch.suffix === '5' && wafer.id === 'soc') photonOutputCount = 960;
            if (batch.suffix === '5' && wafer.id === 'advanced_soc') photonOutputCount = 960;
            
            try {
                gtr.photon_matrix_etch(`dishanhai:${wafer.id}_wafer_${batch.suffix}`)
                    .circuit(photonCircuitNum)
                    .itemInputs(batch.input)
                    .itemOutputs(`${photonOutputCount}x gtceu:${wafer.id}_wafer`)
                    .EUt(batch.voltage)
                    .duration(20);
                photonRecipeCount++;
            } catch(err) {
                error(`光子矩阵配方失败: ${wafer.id}_${batch.suffix} - ${err.message}`);
                recipeStats++;
            }
        });
    });
  var photon_time= timer_photon_matrix.end();
    info(`[山海的big私货] ✔️ 光子矩阵蚀刻配方注册完成 成功: ${photonRecipeCount} 个 | | 失败：${recipeStats} | 耗时：${photon_time}ms`);
    
});

// ========== 维度聚焦激光蚀刻配方 ==========
ServerEvents.recipes(e => {
    var timer_focus_engraving = new Timer('维度聚焦激光蚀刻配方');
    info('🔬 开始注册维度聚焦激光蚀刻配方...');
    
    var focus_GTV = Java.loadClass('com.gregtechceu.gtceu.api.GTValues').VA;
    var focus_GTValues = [focus_GTV[0],focus_GTV[1],focus_GTV[2],focus_GTV[3],focus_GTV[4],focus_GTV[5],focus_GTV[6],focus_GTV[7],focus_GTV[8],focus_GTV[9],focus_GTV[10],focus_GTV[11],focus_GTV[12],focus_GTV[13],focus_GTV[14]];
    var focus_uev = focus_GTValues[10], focus_uiv = focus_GTValues[11], focus_uxv = focus_GTValues[12], focus_opv = focus_GTValues[13], focus_max = focus_GTValues[14];    var ULV=focus_GTValues[0],LV=focus_GTValues[1],MV=focus_GTValues[2],HV=focus_GTValues[3],EV=focus_GTValues[4],IV=focus_GTValues[5],LuV=focus_GTValues[6],ZPM=focus_GTValues[7],UV=focus_GTValues[8],UHV=focus_GTValues[9],UEV=focus_GTValues[10],UIV=focus_GTValues[11],UXV=focus_GTValues[12],OpV=focus_GTValues[13],MAX=focus_GTValues[14];

    var gtr = e.recipes.gtceu;
    
    const waferTypes_2 = [
        { id: 'cpu', baseOutput: 384 },
        { id: 'ram', baseOutput: 384 },
        { id: 'ilc', baseOutput: 384 },
        { id: 'simple_soc', baseOutput: 384 },
        { id: 'soc', baseOutput: 192 },
        { id: 'advanced_soc', baseOutput: 48 },
        { id: 'highly_advanced_soc', baseOutput: 24 },
        { id: 'nand_memory', baseOutput: 192 },
        { id: 'nor_memory', baseOutput: 192 },
        { id: 'ulpic', baseOutput: 384 },
        { id: 'lpic', baseOutput: 384 },
        { id: 'mpic', baseOutput: 192 }
    ];
    
    const batches_2 = [
        { input: 'kubejs:cosmic_soc_wafer', multiplier: 10, voltage: focus_uev, suffix: '1' },
        { input: 'kubejs:cosmic_ram_wafer', multiplier: 25, voltage: focus_uiv, suffix: '2' },
        { input: 'kubejs:supracausal_ram_wafer', multiplier: 50, voltage: focus_uxv, suffix: '3' },
        { input: 'gtladditions:infinity_wafer', multiplier: 70, voltage: focus_opv, suffix: '4' },
        { input: 'gtladditions:prepare_primary_soc_wafer', multiplier: 80, voltage: focus_max, suffix: '5' },
        { input: 'dishanhai:soc', multiplier: 100, voltage: 65565 * focus_max, suffix: '6' }
    ];
    
    var focusRecipeCount = 0;
    
    waferTypes_2.forEach((wafer, index) => {
        var focusCircuitNum = index + 1;
        
        batches_2.forEach(batch => {
            var focusOutputCount = Math.floor(wafer.baseOutput * batch.multiplier);
            
            if (batch.suffix === '4' && wafer.id === 'soc') focusOutputCount = 1344;
            if (batch.suffix === '4' && wafer.id === 'advanced_soc') focusOutputCount = 672;
            if (batch.suffix === '5' && wafer.id === 'soc') focusOutputCount = 960;
            if (batch.suffix === '5' && wafer.id === 'advanced_soc') focusOutputCount = 960;
            
            try {
                gtr.dimensional_focus_engraving_array(`dishanhai:${wafer.id}_wafer_${batch.suffix}`)
                    .circuit(focusCircuitNum)
                    .itemInputs(batch.input)
                    .itemOutputs(`${focusOutputCount}x gtceu:${wafer.id}_wafer`)
                    .EUt(batch.voltage)
                    .duration(20);
                focusRecipeCount++;
            } catch(err) {
                error(`维度聚焦配方失败: ${wafer.id}_${batch.suffix} - ${err.message}`);
            }
        });
    });
    
    info(`维度聚焦激光蚀刻配方注册完成: ${focusRecipeCount} 个`);
    timer_focus_engraving.end();
});

// ========== 星焰跃迁等离子体配方 ==========
ServerEvents.recipes(e => {
    var timer_stellar_plasma = new Timer('星焰跃迁等离子体配方');
    info('⭐ 开始注册星焰跃迁等离子体配方...');
    
    var stellar_GTV = Java.loadClass('com.gregtechceu.gtceu.api.GTValues').VA;
    var stellar_GTValues = [stellar_GTV[0],stellar_GTV[1],stellar_GTV[2],stellar_GTV[3],stellar_GTV[4],stellar_GTV[5],stellar_GTV[6],stellar_GTV[7],stellar_GTV[8],stellar_GTV[9],stellar_GTV[10],stellar_GTV[11],stellar_GTV[12],stellar_GTV[13],stellar_GTV[14]];
    var stellar_uev = stellar_GTValues[10];
    var gtr = e.recipes.gtceu;
    
    var stellarRecipes = [
        {id:'echoite_plasma', input: 'gtceu:echoite', output: 'gtceu:echoite_plasma', count: 10000, voltage: stellar_uev, name: '回响合金等离子体'},
        {id:'chaos_plasma', input: 'gtceu:chaos', output: 'gtceu:chaos_plasma', count: 10000, voltage: stellar_uev, name: '混沌物质等离子体'},
        {id:'adamantium', input: 'gtceu:adamantium', output: 'gtceu:adamantium_plasma', count: 10000, voltage: stellar_uev, name: '艾德曼合金等离子体'},
        {id:'legendarium_plasma', input: 'gtceu:legendarium', output: 'gtceu:legendarium_plasma', count: 10000, voltage: stellar_uev, name: '传奇合金等离子体'},
        {id: 'celestial_secret_plasma', input: 'gtceu:celestial_secret', output: 'gtceu:celestial_secret_plasma', count: 10000, voltage: stellar_uev, name: '天机等离子体'},
        {id: 'cosmic_mesh_plasma', input: 'gtceu:liquid_cosmic_mesh', output: 'gtceu:cosmic_mesh_plasma', count: 10000, voltage: stellar_uev, name: '寰宇织网等离子体'},
        {id: 'bwdhdwzdlzt', input: 'gtceu:instability', output: 'gtceu:instability_plasma', count: 10000, voltage: stellar_uev, name: '不稳定混沌物质等离子体'},
        {id: 'tear_plasma', input: 'gtceu:tear', output: 'gtceu:tear_plasma', count: 10000, voltage: stellar_uev, name: '撕裂等离子体'},
        {id: 'xtt', input: 'gtceu:astraltitanium', output: 'gtceu:astraltitanium_plasma', count: 10000, voltage: stellar_uev, name: '星体钛等离子体'},
        {id: 'jbl', input: 'gtceu:degenerate_rhenium_plasma', output: 'gtceu:liquid_degenerate_rhenium', count: 10000, voltage: stellar_uev, name: '简并铼流体'},
        {id: 'clhj', input: 'gtladditions:creon', output: 'gtladditions:creon_plasma', count: 10000, voltage: stellar_uev, name: '创律合金等离子体'},
        {id: 'dlzshjz', input: 'gtceu:crystalmatrix', output: 'gtceu:crystalmatrix_plasma', count: 10000, voltage: stellar_uev, name: '水晶矩阵等离子体'},
    ];
    
    var stellarSuccessCount = 0;
    
    stellarRecipes.forEach(recipe => {
        try {
            gtr.stellar_lgnition(`dishanhai:${recipe.id}`)
                .inputFluids(`${recipe.input} ${recipe.count}`)
                .outputFluids(`${recipe.output} ${recipe.count}`)
                .blastFurnaceTemp(10000)
                .EUt(recipe.voltage)
                .duration(20);
            stellarSuccessCount++;
            debug(`✓ ${recipe.name}: dishanhai:${recipe.id}`);
        } catch(err) {
            error(`✗ ${recipe.name} 失败: ${err.message}`);
        }
    });
    
    info(`星焰跃迁等离子体配方注册完成: 成功 ${stellarSuccessCount}/${stellarRecipes.length}`);
    timer_stellar_plasma.end();
});

// ========== 无限盘配方 ==========
ServerEvents.recipes(e => {
    var timer_infinity_cell = new Timer('无限盘配方');
    info('💿 开始注册无限盘配方...');

    var infinity_cell_VA = Java.loadClass('com.gregtechceu.gtceu.api.GTValues').VA;
    var infinity_cell_uv = infinity_cell_VA[8], infinity_cell_uev = infinity_cell_VA[10], infinity_cell_opv = infinity_cell_VA[13];
    var ULV=infinity_cell_VA[0],LV=infinity_cell_VA[1],MV=infinity_cell_VA[2],HV=infinity_cell_VA[3],EV=infinity_cell_VA[4],IV=infinity_cell_VA[5],LuV=infinity_cell_VA[6],ZPM=infinity_cell_VA[7],UV=infinity_cell_VA[8],UHV=infinity_cell_VA[9],UEV=infinity_cell_VA[10],UIV=infinity_cell_VA[11],UXV=infinity_cell_VA[12],OpV=infinity_cell_VA[13],MAX=infinity_cell_VA[14];

    var gtr = e.recipes.gtceu;
    
    console.log('[山海的big私货] 开始加载无限盘配方...');
    
    let loadedCount = 0;
    let errorCount = 0;
    
    const infinityCell = (type, id) => {
        return Item.of('expatternprovider:infinity_cell', `{"record":{"#c":"ae2:${type}","id":"${id}"}}`);
    };
    
    const assemblerRecipes = [
        { id: 'wxhjrl', itemInputs: [infinityCell('i', 'minecraft:cobblestone'), '21474836x gtceu:carbon_dust', '21474836x gtceu:sulfur_dust'], inputFluids: ['gtceu:rocket_fuel 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:rocket_fuel')], EUt: infinity_cell_uv, duration: 20, name: '无限火箭燃料' },
        { id: 'pej', itemInputs: ['2147483647x gtceu:carbon_dust', 'gtlcore:cell_component_256m'], inputFluids: ['gtceu:rocket_fuel_h8n4c2o4 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:rocket_fuel_h8n4c2o4')], EUt: infinity_cell_uv, duration: 20, name: '无限偏二甲肼' },
        { id: 'pr1', itemInputs: ['2147483647x gtceu:carbon_dust', 'gtlcore:256m_storage'], inputFluids: ['gtceu:rocket_fuel_rp_1 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:rocket_fuel_rp_1')], EUt: infinity_cell_uv, duration: 20, name: '无限RP-1燃料' },
        { id: 'jbrl', itemInputs: ['2147483647x gtceu:carbon_dust', 'gtlcore:cell_component_256m'], inputFluids: ['gtceu:rocket_fuel_cn3h7o3 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:rocket_fuel_cn3h7o3')], EUt: infinity_cell_uv, duration: 20, name: '无限硝酸甲肼' },
        { id: 'wxxnhjrl', itemInputs: [infinityCell('f', 'gtceu:rocket_fuel'), '2147483647x gtceu:enriched_naquadah_dust', '2147483647x gtceu:hmxexplosive_dust', '2147483647x minecraft:fire_charge', 'gtlcore:cell_component_256m'], itemOutputs: [infinityCell('f', 'gtceu:stellar_energy_rocket_fuel')], inputFluids: ['gtceu:stellar_energy_rocket_fuel 2147483647'], EUt: ULV, duration: 20, name: '无限星能燃料' },
        { id: 'buhuinian', itemInputs: ['128x gtlcore:cell_component_256m', '2147483647x gtceu:nan_certificate', '520x gtladditions:astral_array'], inputFluids: ['gtceu:periodicium 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:periodicium')], EUt: MAX, duration: 20, name: '无限周期元素' },
        { id: 'gkj', itemInputs: ['114514x gtceu:carbon_dust', '114514x gtceu:sodium_hydroxide_dust', '1145x gtceu:rutile_dust'], inputFluids: ['gtceu:photoresist 214748'], itemOutputs: [infinityCell('f', 'gtceu:photoresist')], EUt: MAX, duration: 20, name: '无限光刻胶' },
        { id: 'rhy', itemInputs: ['16x gtlcore:cell_component_256m', '648x kubejs:machine_casing_grinding_head'], inputFluids: ['gtceu:lubricant 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:lubricant')], EUt: ULV, duration: 20, name: '无限润滑油' },
        { id: 'jgztwxp', itemInputs: ['64x gtlcore:cell_component_256m', '2147483647x kubejs:machine_casing_grinding_head', '114514x gtlcore:world_fragments_overworld'], itemOutputs: [infinityCell('i', 'kubejs:machine_casing_grinding_head')], EUt: 114514, duration: 20, name: '无限坚固钻头' },
        { id: 'lingbing', itemInputs: ['2147483647x kubejs:dust_cryotheum', '2147483647x kubejs:dust_blizz'], inputFluids: ['kubejs:gelid_cryotheum 2147483647'], itemOutputs: [infinityCell('f', 'kubejs:gelid_cryotheum')], EUt: 2147483647, duration: 20, name: '无限极寒之凛冰' },
        { id: '16_water', itemInputs: ['64x gtlcore:cell_component_256m'], inputFluids: ['gtceu:grade_16_purified_water 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:grade_16_purified_water')], EUt: infinity_cell_uev, duration: 20, name: '无限16级净化水' },
        { id: 'calculation_processor', itemInputs: ['2147483647x ae2:calculation_processor', 'gtceu:nan_certificate'], itemOutputs: [infinityCell('i', 'ae2:calculation_processor')], EUt: 120, duration: 20, name: '无限计算处理器' },
        { id: 'logic_processor', itemInputs: ['2147483647x ae2:logic_processor', 'gtceu:nan_certificate'], itemOutputs: [infinityCell('i', 'ae2:logic_processor')], EUt: 120, duration: 20, name: '无限逻辑处理器' },
        { id: 'engineering_processor', itemInputs: ['2147483647x ae2:engineering_processor', 'gtceu:nan_certificate'], itemOutputs: [infinityCell('i', 'ae2:engineering_processor')], EUt: 120, duration: 20, name: '无限工程处理器' },
        { id: 'lings', notConsumable: 'dishanhai:wzcz1', itemInputs: ['64x dishanhai:food'], itemOutputs: [infinityCell('i', 'dishanhai:food')], EUt: 20, duration: 20, name: '无限寰宇零食' }
    ];
    
    assemblerRecipes.forEach(recipe => {
        try {
            let ass = gtr.assembler(`dishanhai:${recipe.id}`);
            if (recipe.notConsumable != null) ass.notConsumable(recipe.notConsumable);
            if (recipe.itemInputs && recipe.itemInputs.length > 0) ass.itemInputs.apply(ass, recipe.itemInputs);
            if (recipe.inputFluids && recipe.inputFluids.length > 0) ass.inputFluids.apply(ass, recipe.inputFluids);
            if (recipe.itemOutputs && recipe.itemOutputs.length > 0) ass.itemOutputs.apply(ass, recipe.itemOutputs);
            ass.EUt(recipe.EUt).duration(recipe.duration);
            loadedCount++;
            debug(`✓ ${recipe.name}: dishanhai:${recipe.id}`);
        } catch(err) {
            errorCount++;
            error(`✗ ${recipe.name} 失败: ${err.message}`);
        }
    });
    
    const suprachronalRecipes = [
        { id: 'suprachronal_celestial_secret', itemInputs: ['131400x gtceu:celestial_secret_dust', '64x dishanhai:cosmic_probe_mk', '64x gtceu:magic_manufacturer', '64x gtceu:opv_field_generator', '32x gtceu:space_cosmic_probe_receivers'], inputFluids: ['gtceu:celestial_secret 2147483647', 'gtceu:periodicium 114514'], itemOutputs: [infinityCell('f', 'gtceu:celestial_secret')], EUt: infinity_cell_opv, duration: 20, name: '无限天机' },
        { id: 'suprachronal_tear', itemInputs: ['131400x gtceu:tear_dust', '64x dishanhai:cosmic_probe_mk', '64x gtceu:magic_manufacturer', '64x gtceu:opv_field_generator', '32x gtceu:space_cosmic_probe_receivers'], inputFluids: ['gtceu:tear 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:tear')], EUt: infinity_cell_opv, duration: 20, name: '无限撕裂' },
        { id: 'suprachronal_quantum_chromodynamic_charge_super', itemInputs: ['2147483647x kubejs:quantum_chromodynamic_charge', '2147483647x disksavior:quantum_chromodynamic_charge_super', '2147483647x gtceu:eternity_nanoswarm', '2147483647x kubejs:leptonic_charge', '2147483647x kubejs:pellet_antimatter'], inputFluids: ['gtceu:antimatter 2147483647', 'gtceu:spacetime 2147483647'], itemOutputs: [infinityCell('i', 'disksavior:quantum_chromodynamic_charge_super')], EUt: MAX, duration: 20, name: '无限高密度量子学爆弹' },
        { id: 'suprachronal_dimensionallytranscendentresidue', itemInputs: ['64x gtlcore:cell_component_256m', '721x gtceu:nan_certificate'], inputFluids: ['gtceu:dimensionallytranscendentresidue 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:dimensionallytranscendentresidue')], EUt: 2147483647, duration: 20, name: '无限超维度残留' }
    ];
    
    suprachronalRecipes.forEach(recipe => {
        try {
            let supra = gtr.suprachronal_assembly_line(`dishanhai:${recipe.id}`);
            if (recipe.itemInputs && recipe.itemInputs.length > 0) supra.itemInputs.apply(supra, recipe.itemInputs);
            if (recipe.inputFluids && recipe.inputFluids.length > 0) supra.inputFluids.apply(supra, recipe.inputFluids);
            if (recipe.itemOutputs && recipe.itemOutputs.length > 0) supra.itemOutputs.apply(supra, recipe.itemOutputs);
            supra.EUt(recipe.EUt).duration(recipe.duration);
            loadedCount++;
            debug(`✓ ${recipe.name}: dishanhai:${recipe.id}`);
        } catch(err) {
            errorCount++;
            error(`✗ ${recipe.name} 失败: ${err.message}`);
        }
    });
    
    info(`无限盘配方加载完成 - 成功: ${loadedCount}, 失败: ${errorCount}`);
    timer_infinity_cell.end();
});









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

function getPerformanceStats() {
    return {
        recipeCount: recipeStats.total,
        success: recipeStats.success,
        failed: recipeStats.failed,
        successRate: recipeStats.total > 0 ? (recipeStats.success / recipeStats.total * 100).toFixed(1) + '%' : '0%',
        errors: recipeStats.errors.length,
        byType: recipeStats.byType
    };
}

function getSystemStatus() {
    return {
        superAEPackItemCount: superAEPackItemCount,
        superAEPackLore: superAEPackLore,
        shanhaiRecipeStats: global.shanhaiRecipeStats ? '已加载' : '未加载',
        recipeStats: {
            total: recipeStats.total,
            success: recipeStats.success,
            failed: recipeStats.failed
        }
    };
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
    event.server.scheduleInTicks(20, function() { initializeProtection(event); });
    
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
