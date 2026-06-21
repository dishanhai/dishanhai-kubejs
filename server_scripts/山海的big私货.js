﻿// priority:70
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
    
    safeAddRecipe: protectAPI(
        function(type, id, recipeFunc) {
            try {
                // 创建安全物品创建函数
                var safeItemOf = (function() {
                    var originalItemOf = Item.of;
                    var placeholderId = 'dishanhai:zwf';
                    
                    return function safeItemOf() {
                        try {
                            // 调用原始Item.of，根据参数数量调用
                            if (arguments.length === 0) {
                                return originalItemOf();
                            } else if (arguments.length === 1) {
                                return originalItemOf(arguments[0]);
                            } else if (arguments.length === 2) {
                                return originalItemOf(arguments[0], arguments[1]);
                            } else {
                                return originalItemOf(arguments[0], arguments[1], arguments[2]);
                            }
                        } catch (error) {
                            // 如果物品创建失败，使用占位符替代
                            var errorMsg = error.message || String(error);
                            warn('[API safeAddRecipe] 物品无法匹配，使用占位符替代: ' + errorMsg);
                            
                            // 尝试从参数中获取数量
                            var count = 1;
                            var tag = null;
                            var id = placeholderId;
                            
                            // 解析参数：可能是单个字符串或多个参数
                            if (arguments.length === 1 && typeof arguments[0] === 'string') {
                                // 格式如 "1x minecraft:diamond" 或 "minecraft:diamond"
                                var str = arguments[0];
                                var match = str.match(/^(\d+)x\s+(.+)$/);
                                if (match) {
                                    count = parseInt(match[1], 10);
                                    id = match[2];
                                } else {
                                    id = str;
                                }
                            } else if (arguments.length >= 1) {
                                // 格式如 Item.of(id, count, tag)
                                id = arguments[0];
                                if (arguments.length >= 2 && typeof arguments[1] === 'number') {
                                    count = arguments[1];
                                }
                                if (arguments.length >= 3 && typeof arguments[2] === 'object') {
                                    tag = arguments[2];
                                }
                            }
                            
                            // 始终使用占位符ID，但保留原始数量
                            if (tag) {
                                return originalItemOf(placeholderId, count, tag);
                            } else {
                                return originalItemOf(placeholderId, count);
                            }
                        }
                    };
                })();
                
                // 创建recipeObj对象，包含安全物品创建函数
                var recipeObj = {
                    safeItemOf: safeItemOf,
                    type: type,
                    id: id
                };
                
                // 调用配方函数，传递recipeObj
                recipeFunc(recipeObj);
                recordRecipe(type, true, id);
                return true;
            } catch(err) {
                recordRecipe(type, false, id, err.message);
                return false;
            }
        },
        [
            function(p) { return validateString(p, 'type', 1, 50); },
            function(p) { return validateString(p, 'id', 1, 200); },
            function(p) { 
                if (typeof p !== 'function') {
                    throw new Error('参数 recipeFunc 必须是函数，实际类型: ' + typeof p);
                }
                return p;
            }
        ],
        { 
            logPerformance: true,
            requireOp: false,
            maxCallPerSecond: 50 // 配方添加频率限制
        }
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
        
        // 1. 先从配方收集器查找（safeAddRecipe 添加的配方）
        if (global.shanhaiRecipeInfoCollector) {
            var collected = global.shanhaiRecipeInfoCollector[searchId];
            if (collected) {
                return { recipe: collected, source: '配方收集器(safeAddRecipe)' };
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
    
    // =====================================================
    // =============== 配方加载系统主控 =================
    // =====================================================
    
    var gtr = e.recipes.gtceu;  global._shanhaiGTR = gtr;
    var VA = [8,32,128,512,2048,8192,32768,131072,524288,2097152,8388608,33554432,134217728,536870912,2147483647];
    var ULV=VA[0],LV=VA[1],MV=VA[2],HV=VA[3],EV=VA[4],IV=VA[5],LuV=VA[6],ZPM=VA[7],UV=VA[8],UHV=VA[9],UEV=VA[10],UIV=VA[11],UXV=VA[12],OpV=VA[13],MAX=VA[14];
    var ulv=VA[0],lv=VA[1],mv=VA[2],hv=VA[3],ev=VA[4],iv=VA[5],luv=VA[6],zpm=VA[7],uv=VA[8],uhv=VA[9],uev=VA[10],uiv=VA[11],uxv=VA[12],opv=VA[13],max=VA[14];
    // ===================================================================
    // =============== safeAddRecipe (配方加载系统主控安全添加配方) ===========
    // =============== 配方加载系统主控集成(v2.3新增)&配方统计主控 =============
    // ===================================================================
    
    // 安全物品创建包装器
    function createSafeItemOfWrapper() {
        var originalItemOf = Item.of;
        var placeholderId = 'dishanhai:zwf';
        
        return function safeItemOf() {
            try {
                // 调用原始Item.of，根据参数数量调用
                var result;
                if (arguments.length === 0) {
                    result = originalItemOf();
                } else if (arguments.length === 1) {
                    result = originalItemOf(arguments[0]);
                } else if (arguments.length === 2) {
                    result = originalItemOf(arguments[0], arguments[1]);
                } else {
                    result = originalItemOf(arguments[0], arguments[1], arguments[2]);
                }
                
                // 检查Item.of是否返回了minecraft:air（表示物品不存在）
                if (result && result.id === 'minecraft:air') {
                    var inputId = arguments.length >= 1 ? arguments[0] : '';
                    var checkId = inputId;
                    
                    // 解析字符串格式，如 "3x nonexistent:item"
                    if (typeof inputId === 'string') {
                        var match = inputId.match(/^(\d+)x\s+(.+)$/);
                        if (match) {
                            checkId = match[2]; // 提取物品ID部分
                        }
                    }
                    
                    if (typeof inputId === 'string' && checkId !== 'minecraft:air' && checkId !== 'air') {
                        // 请求的不是minecraft:air，但Item.of返回了air，说明物品无效
                        // 抛出异常以触发占位符替换
                        throw new Error('物品不存在，Item.of返回minecraft:air: ' + checkId);
                    }
                }
                
                return result;
            } catch (error) {
                // 如果物品创建失败，使用占位符替代
                var errorMsg = error.message || String(error);
                warn('[safeAddRecipe] 物品无法匹配，使用占位符替代: ' + errorMsg);
                
                // 尝试从参数中获取数量
                var count = 1;
                var tag = null;
                var id = placeholderId;
                
                // 解析参数：可能是单个字符串或多个参数
                if (arguments.length === 1 && typeof arguments[0] === 'string') {
                    // 格式如 "1x minecraft:diamond" 或 "minecraft:diamond"
                    var str = arguments[0];
                    var match = str.match(/^(\d+)x\s+(.+)$/);
                    if (match) {
                        count = parseInt(match[1], 10);
                        id = match[2];
                    } else {
                        id = str;
                    }
                } else if (arguments.length >= 1) {
                    // 格式如 Item.of(id, count, tag)
                    id = arguments[0];
                    if (arguments.length >= 2 && typeof arguments[1] === 'number') {
                        count = arguments[1];
                    }
                    if (arguments.length >= 3 && typeof arguments[2] === 'object') {
                        tag = arguments[2];
                    }
                }
                
                // 始终使用占位符ID，但保留原始数量
                if (tag) {
                    return originalItemOf(placeholderId, count, tag);
                } else {
                    return originalItemOf(placeholderId, count);
                }
            }
        };
    }
    
    // 自动应用配方字段到机器的内部函数
    function _applyRecipeFields(machine, r) {
        if (r.triggerJsError) throw new Error("测试JavaScript执行错误：这是在配方函数内部抛出的错误");
        
        machine.duration(r.duration);
        if (r.type !== 'cosmos_simulation' && r.EUt != null) machine.EUt(r.EUt);

        if (r.dynamicOutputs) {
            var gemOutputIds = Ingredient.of('#forge:exquisite_gems').getItemIds();
            var outputs = gemOutputIds.map(function(id) { return '16x ' + id; });
            if (outputs.length) machine.itemOutputs.apply(machine, outputs);
        }
        if (r.dy_cell) {
            var dyes = Ingredient.of('#forge:dyes').getItemIds();
            var outputs = dyes.map(function(id) { return id; });
            if (outputs.length) machine.itemOutputs.apply(machine, outputs);
        }

        var val = sanitize(r.notConsumable);
        if (val) (Array.isArray(val) ? val : [val]).forEach(function(i) { machine.notConsumable(i); });

        val = sanitize(r.notConsumableFluid);
        if (val) (Array.isArray(val) ? val : [val]).forEach(function(i) { machine.notConsumableFluid(i); });

        var c = sanitize(r.circuit);
        if (c != null) machine.circuit(c);

        ['itemInputs', 'inputFluids', 'itemOutputs', 'outputFluids'].forEach(function(k) {
            var arr = sanitize(r[k]);
            if (arr?.length && !r.dynamicOutputs) {
                machine[k].apply(machine, arr);
            }
        });

        var t = sanitize(r.blastFurnaceTemp);
        if (t != null) machine.blastFurnaceTemp(t);

        var ad = sanitize(r.addData);
        var aid = sanitize(r.addDataid);
        if (ad != null && aid != null) machine.addData(aid, ad);

        if (r.stationResearch && (r.type === 'assembly_line' || r.type === 'suprachronal_assembly_line' || r.type === 'circuit_assembly_line' || r.type === 'component_assembly_line')) {
            var rs = sanitize(r.stationResearch.researchStack);
            var ds = sanitize(r.stationResearch.dataStack);
            var eu = sanitize(r.stationResearch.EUt);
            var cw = sanitize(r.stationResearch.CWUt);
            if (rs != null && ds != null && eu != null && cw != null) {
                machine.stationResearch(b => b.researchStack(Registries.getItemStack(rs)).dataStack(Registries.getItemStack(ds)).EUt(eu).CWUt(cw));
            } else console.warn('⚠️ ' + r.id + ' stationResearch 无效');
        } else if (r.stationResearch) console.warn('⚠️ ' + r.id + ' 类型 ' + r.type + ' 不支持 stationResearch');
    }
    
    function safeAddRecipe(arg1,arg2,arg3,arg4){
        let type,id,recipeFunc,recipeObj;

        // ---- 参数解析 ----
        if(typeof arg1==="string" && typeof arg2==="string"){
            type=arg1; id=arg2; recipeFunc=arg3; recipeObj=arg4||{};
        }
        // ========== 新增：处理 arg2 是配方对象的情况 ==========
        else if(typeof arg1==="string" && typeof arg2==="object" && arg2 !== null){
            type=arg1;
            recipeObj=arg2;
            id=recipeObj.id;
            recipeFunc=arg3;
            // 如果 recipeObj 中没有 type，使用 arg1
            if(!recipeObj.type) recipeObj.type = type;
        }
        else if(typeof arg1==="object" && arg1!==null){
            recipeObj=arg1; type=recipeObj.type; id=recipeObj.id; recipeFunc=arg2;
        }
        else if(typeof arg1==="string" && typeof arg2==="function"){
            type=arg1; id="unknown"; recipeFunc=arg2; recipeObj={type:type,id:id};
        }
        else{
            error("❌ safeAddRecipe 调用方式错误");
            broadcastRecipeError("safeAddRecipe", "invalid_parameters", "调用方式错误");
            return false;
        }

        // ========== 新增：自动收集配方信息 (v2.38新增) ==========
        var finalId = id;
        if(finalId && finalId.indexOf(":") === -1){
            finalId = "dishanhai:" + finalId;
        }
        
        // 提取 defaultEnabled 值
        var defaultEnabledValue = null;
        if (recipeObj && typeof recipeObj.defaultEnabled === 'boolean') {
            defaultEnabledValue = recipeObj.defaultEnabled;
        } else if (typeof arg4 === 'object' && arg4 && typeof arg4.defaultEnabled === 'boolean') {
            defaultEnabledValue = arg4.defaultEnabled;
        }
        
        // 收集配方信息
        if (finalId) {
            var normalizedId = finalId;
            if (normalizedId.startsWith('dishanhai:')) {
                normalizedId = normalizedId.substring(10);
            } else if (normalizedId.startsWith('dishanahi:')) {
                normalizedId = normalizedId.substring(9);
            }
            
            recipeInfoCollector[normalizedId] = {
                id: normalizedId,
                fullId: finalId,
                type: type,
                defaultEnabled: defaultEnabledValue !== false, // 默认 true
                timestamp: Date.now()
            };
            
            // 同时保存到全局，供配置修复脚本读取
            if (typeof global !== 'undefined') {
                if (!global.shanhaiRecipeInfoCollector) {
                    global.shanhaiRecipeInfoCollector = {};
                }
                global.shanhaiRecipeInfoCollector[normalizedId] = recipeInfoCollector[normalizedId];
            }
            
            debug('📝 收集配方信息: ' + normalizedId + ' (defaultEnabled=' + (defaultEnabledValue !== false) + ')');
        }
        // ===========================================

        // ---- 默认值系统处理 (v2.33新增) ----
        // 如果recipeObj中包含defaultEnabled属性，则设置该配方的本地默认值
        if (recipeObj && typeof recipeObj.defaultEnabled === 'boolean') {
            setLocalRecipeDefault(id, recipeObj.defaultEnabled);
            debug('✅ 从recipeObj设置配方默认值: ' + id + ' = ' + recipeObj.defaultEnabled);
        }

        // ---- 配方加载控制检查 - 修改版：配置文件绝对优先 ----
        // 检查配方是否应该加载，支持多种API接口
        debug('🔍 检查配方加载状态: ' + id + ' (' + type + ')');
        debug('  recipeObj.defaultEnabled = ' + (recipeObj && recipeObj.defaultEnabled));
        debug('  localDefault = ' + getLocalRecipeDefault(id));
        debug('  recipeLoadConfig 中该配方的值 = ' + (global.shanhaiRecipeLoadConfig ? global.shanhaiRecipeLoadConfig[id] : 'N/A'));
        var recipeEnabled = true; // 默认启用
        
        // 首先检查配置文件（最高优先级）
        var hasConfigInFile = false;
        var configValue = null;
        
        if (global.shanhaiRecipeLoadConfig) {
            // 检查多种ID格式
            if (global.shanhaiRecipeLoadConfig.hasOwnProperty(id)) {
                hasConfigInFile = true;
                configValue = global.shanhaiRecipeLoadConfig[id];
            } else if (global.shanhaiRecipeLoadConfig.hasOwnProperty('dishanhai:' + id)) {
                hasConfigInFile = true;
                configValue = global.shanhaiRecipeLoadConfig['dishanhai:' + id];
            } else if (id.startsWith('dishanhai:') && global.shanhaiRecipeLoadConfig.hasOwnProperty(id.substring(10))) {
                hasConfigInFile = true;
                configValue = global.shanhaiRecipeLoadConfig[id.substring(10)];
            }
        }
        
        // 如果配置文件中有明确设置，直接使用配置值
        if (hasConfigInFile && configValue !== null) {
            recipeEnabled = configValue === true;
            debug('  配置文件优先: ' + id + ' = ' + recipeEnabled);
        } else {
            // 配置文件中没有设置，才检查 defaultEnabled
            if (recipeObj && typeof recipeObj.defaultEnabled === 'boolean') {
                recipeEnabled = recipeObj.defaultEnabled;
                debug('  使用 defaultEnabled: ' + id + ' = ' + recipeEnabled);
                
                // 重要：将 defaultEnabled 的值写入配置文件，这样用户后续可以通过命令覆盖
                if (typeof global.shanhaiRecipeControlAPI !== 'undefined' && 
                    typeof global.shanhaiRecipeControlAPI.setRecipeEnabled === 'function') {
                    global.shanhaiRecipeControlAPI.setRecipeEnabled(id, recipeEnabled);
                    debug('  已将 defaultEnabled 同步到配置文件: ' + id + ' = ' + recipeEnabled);
                }
            } else {
                recipeEnabled = true;
                debug('  使用默认值（启用）: ' + id);
            }
        }
        
        // 如果配方控制API可用且配置文件中没有设置，也同步一下状态
        if (!hasConfigInFile && typeof global.shanhaiRecipeControlAPI !== 'undefined' && 
            typeof global.shanhaiRecipeControlAPI.isRecipeEnabled === 'function') {
            // 确保配方控制API返回的值与我们的判断一致
            var apiValue = global.shanhaiRecipeControlAPI.isRecipeEnabled(id);
            if (apiValue !== recipeEnabled) {
                debug('  同步配方控制API状态: ' + id + ' 从 ' + apiValue + ' 到 ' + recipeEnabled);
                global.shanhaiRecipeControlAPI.setRecipeEnabled(id, recipeEnabled);
            }
        }
        
        // 如果都没有设置，保持默认值（启用所有配方）
        
        if (!recipeEnabled) {
            recipeStats.disabled++;
            info('⏭️ 配方加载已禁用，跳过: ' + id + ' (' + type + ')');
            debug('配方 ' + id + ' (' + type + ') 已被禁用，不计入统计');
            return true; // 返回true表示"成功跳过"，不视为失败
        }

        // ---- 跳过 duration 检查 ----
        // 对于直接传入函数的情况，不检查 duration 和 EUt，由函数内部处理
        if (typeof arg3 === 'function') {
            // 执行配方函数（提供安全物品创建函数）
            var safeItemOf = createSafeItemOfWrapper();
            try{
                // 添加安全物品创建函数到recipeObj，供配方函数使用
                recipeObj.safeItemOf = safeItemOf;
                recipeFunc(recipeObj);
                recordRecipe(type,true,id);
                return true;
            }catch(err){
                recordRecipe(type,false,id,err.message);
                broadcastRecipeError(type, id, err.message);
                return false;
            }
        }

        // ---- 自动补全命名空间 ----
        if(id.indexOf(":")===-1){
            id="dishanhai:"+id;
            recipeObj.id=id;
        } else {
            recipeObj.id=id;
        }

        // ---- 参数检查 ----
        const duration = recipeObj.duration;
        const eut = recipeObj.EUt;

        // 检查配方类型是否有效（GT机器或原版配方）
        const isGtRecipe = gtr[type] !== undefined;
        const isVanillaRecipe = e[type] !== undefined;
        
        if (!isGtRecipe && !isVanillaRecipe) {
            recordRecipe(type, false, id, "未知机器或配方类型");
            broadcastRecipeError(type, id, "未知机器或配方类型");
            return false;
        }
        
        // 仅对GT机器配方检查duration和EUt
        if (isGtRecipe) {
            if (recipeObj && duration == null) {
                warn(`⚠️ 配方 ${id} (${type}) duration 缺失，跳过`);
                recordRecipe(type, false, id, 'duration值缺失');
                typeFailed++;
                return false;
            }
            if (recipeObj && type !== 'cosmos_simulation' && eut == null) {
                warn(`⚠️ 配方 ${id} (${type}) EUt 缺失，跳过`);
                recordRecipe(type, false, id, 'EUt值缺失');
                typeFailed++;
                return false;
            }
        }

        // ---- 执行 ----
        var safeItemOf = createSafeItemOfWrapper();
        try{
            recipeObj.safeItemOf = safeItemOf;
            if (typeof recipeFunc === 'function') {
                // 回调模式：由回调函数处理配方字段
                recipeFunc(recipeObj);
            } else {
                // 自动模式：自动处理所有标准配方字段（API 集成）
                if (!gtr[type]) {
                    throw new Error("未知机器类型: " + type);
                }
                var machine = gtr[type](recipeObj.id);
                _applyRecipeFields(machine, recipeObj);
                machine.save();
            }
            recordRecipe(type,true,id);
            return true;
        }catch(err){
            recordRecipe(type,false,id,err.message);
            broadcastRecipeError(type, id, err.message);
            return false;
        }
    }

function buildRecipe(m, r) { DShanhaiRecipeEngine.applyAll(m, r); }

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
        EUt: mv,
        duration: 100
    }*/
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
var asstimer = new Timer('组装机配方添加');

// 预热缓存
DShanhaiRecipeEngine.precache([assrecipes, universalRecipes]);

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

let ass = asstimer.end();
console.log(`🗓️ [山海的big私货] 组装机配方添加完毕 成功:${assSuccess} | 失败:${assFailed} | 耗时:${ass}ms`);

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
    {id:'Dye_component_pack',type:'assembler',itemInputs: ['minecraft:dandelion'],dy_cell:true, EUt: ulv, duration: 20 },
    // 测试占位符替换功能 - 使用不存在的物品ID，应被替换为'dishanhai:zwf'（已禁用，需要显式使用Item.safeOf）
    {id:'test_placeholder',type:'assembler',itemInputs: ['nonexistent:invalid_item', '2x another:missing_item'], itemOutputs: ['3x invalid:output_item'], defaultEnabled: false, EUt: ulv, duration: 20 },
    {id:'assembler_salt_water',type:'chemical_reactor',inputFluids: ['minecraft:water 1000'], outputFluids: ['gtceu:salt_water 1000'], notConsumable: 'dishanhai:wzcz1', EUt: lv, duration: 20 },
    {id:'assembler_module_gate_and_bridg',type:'assembler_module',itemInputs: ['512x dishanhai:wzcz2','16x gtceu:space_elevator','64x gtceu:resource_collection','64x gtceu:assembler_module','64x kubejs:space_drone_mk1','64x gtlcore:power_core','32x gtceu:chemical_distort','64x kubejs:bioware_assembly'], itemOutputs: ['dishanhai:gate_and_bridg'], EUt: uv, duration: 20,addDataid: "SEPMTier", addData: 2},

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

info(`🔓 通用配方开始加载，共 ${universalRecipes.length} 个`);
var timer = new Timer('通用配方添加');
var success = 0, fail = 0;

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

info(`✔️ 通用配方添加完成 | 成功: ${success} | 失败: ${fail} | 耗时: ${timer.end()}ms`);

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

//gt_shanhai模组配方批处理
let myRecipes = [
  // ===== ULV 级 (EUt: ulv) =====
  { id: 'zero_point_conversion_energy', type: 'zero_point_conversion', notConsumable: ['gtceu:lv_electric_pump', 'gtlcore:primitive_fluid_regulator'], inputFluids: ['minecraft:water 3000'], outputFluids: ['dishanhai:zero_point_energy 20'], EUt: ulv, duration: 20 },
  { id: 'photon_siphon_light_item_source', type: 'photon_siphon', notConsumable: ['gtceu:lv_electric_pump', 'gtlcore:primitive_fluid_regulator'], inputFluids: ['dishanhai:zero_point_energy 20'], itemOutputs: ['dishanhai:first_light'], EUt: ulv, duration: 20 },
  { id: 'photon_siphon_light_source', type: 'photon_siphon', notConsumable: ['gtceu:lv_electric_pump', 'gtlcore:primitive_fluid_regulator'], itemInputs: ['2x dishanhai:first_light'], outputFluids: ['dishanhai:light 2000'], EUt: ulv, duration: 20 },
  { id: 'circuit_assembly_wl_board_ulv', type: 'circuit_assembler', itemInputs: ['64x dishanhai:first_light', '8x #gtceu:circuits/ulv'], inputFluids: ['dishanhai:zero_point_energy 8000'], itemOutputs: ['4x dishanhai:wl_board_ulv'], EUt: ulv, duration: 20 },
  { id: 'chemical_bath_primordial_void_induction_armature', type: 'chemical_bath', itemInputs: ['64x gt_shanhai:primordial_omega_engine'], inputFluids: ['dishanhai:zero_point_energy 320000'], itemOutputs: ['gt_shanhai:primordial_void_induction_armature'], EUt: ulv, duration: 20 },
  { id: 'matter_forging_matter_ball_source', type: 'matter_forging',circuit:'1', itemInputs: ['256000x minecraft:cobblestone'], itemOutputs: ['3840x ae2:matter_ball'], EUt: ulv, duration: 20 },
  { id: 'matter_forging_singularity_source', type: 'matter_forging', circuit: '2', itemInputs: ['640x ae2:matter_ball'], itemOutputs: ['ae2:singularity'], EUt: ulv, duration: 20 },
  { id: 'matter_forging_matter_ball_destination', type: 'matter_forging',circuit:'3', inputFluids: ['minecraft:water 15360000'], itemOutputs: ['2560x ae2:matter_ball'], EUt: ulv, duration: 20 },
  { id: 'matter_forging_matter_singularity_source', type: 'matter_forging',circuit:'4', itemInputs: ['131002x ae2:matter_ball', '16x ae2:singularity'], inputFluids: ['dishanhai:zero_point_energy 1000'], itemOutputs: ['dishanhai:matter_singularity'], EUt: ulv, duration: 20 },
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
  { id: 'matter_forging_cosmic_dust', type: 'matter_forging',circuit:'5', itemInputs: ['1x dishanhai:matter_singularity', '64x dishanhai:photon'], inputFluids: ['dishanhai:light 64000', 'dishanhai:zero_point_energy 64000'], itemOutputs: ['1x dishanhai:cosmic_dust'], EUt: 2048, duration: 200, conditions: ["4x dishanhai:wzxc"] },
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
  { id: 'primordial_matter_recombination_wl_board_uv_x4', type: 'primordial_matter_recombination', itemInputs: ['8x dishanhai:light_voyage', '4x kubejs:uv_universal_circuit'], inputFluids: ['dishanhai:matter_fluid_zero 2000'], itemOutputs: ['4x dishanhai:wl_board_uv'], EUt: uv, duration: 200, conditions: ["4x dishanhai:wzqs"] },
  { id: 'primordial_matter_recombination_primordial_engraving_module', type: 'primordial_matter_recombination', itemInputs: [ '64x gtceu:large_engraving_laser', '1x dishanhai:wzgl', '32x dishanhai:nova_catalyst', '128x dishanhai:light_voyage', '256x dishanhai:navigate_prism', '16x dishanhai:worldline_boundless_singularity', '16x gtceu:engraving_laser_plant' ], inputFluids: ['dishanhai:matter_fluid_zero 64000'], itemOutputs: ['1x gt_shanhai:primordial_engraving_module'], EUt: uv, duration: 200, conditions: ["16x dishanhai:wzgl"] },
  { id: 'matter_module_casting_wzgl', type: 'matter_module_casting', itemInputs: [ '64x dishanhai:worldline_divergent_core', '1x dishanhai:wem_2', '32x dishanhai:wl_board_uv', '1024x dishanhai:light_voyage', '1024x dishanhai:navigate_prism', '256x dishanhai:worldline_residual_fragment', '16x dishanhai:nova_catalyst', '8x dishanhai:worldline_boundless_singularity' ], inputFluids: [ 'dishanhai:matter_fluid_advanced 64000', 'dishanhai:matter_fluid_transition 64000', 'dishanhai:matter_fluid_zero 64000' ], itemOutputs: ['1x dishanhai:wzgl'], EUt: uv, duration: 200, conditions: ["64x dishanhai:wzqs"], },
  { id: 'primordial_matter_recombination_worldline_boundless_singularity', type: 'matter_module_casting', itemInputs: [ '16x gtceu:uv_16384a_laser_target_hatch', '16x gtceu:me_extended_export_buffer', '16x gtceu:gravity_hatch', '4x dishanhai:thread_shard_3', '32x dishanhai:light_voyage', '64x dishanhai:primordial_divergence_heart', '64x dishanhai:navigate_prism', '128x dishanhai:cosmic_dust', '1x dishanhai:wem_2', '1x gtceu:chemical_distort', '1x gtceu:space_elevator', '1x gtceu:uv_fusion_reactor', '1x gtceu:large_naquadah_reactor' ], inputFluids: [ 'dishanhai:matter_fluid_zero 8000', 'dishanhai:matter_fluid_transition 16000', 'dishanhai:matter_fluid_advanced 32000' ], itemOutputs: ['4x dishanhai:worldline_boundless_singularity'], EUt: uv, duration: 200, conditions: ["4x dishanhai:wzqs"] },
  { id: 'primordial_causal_weaving_gate_and_bridg', type: 'primordial_causal_weaving', itemInputs: [ '1024x dishanhai:worldline_divergent_core', '64x dishanhai:wl_board_uv', '4096x dishanhai:light_voyage', '1024x dishanhai:genesis_shard' ], inputFluids: ['dishanhai:matter_fluid_zero 5120000', 'dishanhai:dimensional_fabric 4096000'], itemOutputs: ['1x dishanhai:gate_and_bridg'], EUt: uv, duration: 600, conditions: ["64x dishanhai:wzqs"] },
  // ★★★ 新修改 · UV 级机器配方（assembler条件已移除） ★★★
  { id: 'primordial_matter_recombination_integrated_assembly_matrix', type: 'primordial_matter_recombination', itemInputs: [ '16x gtceu:uv_machine_hull', '4x kubejs:uv_universal_circuit', '64x dishanhai:light_voyage', '64x dishanhai:navigate_prism', '16x gtceu:uv_robot_arm', '16x gtceu:uv_conveyor_module' ], inputFluids: ['dishanhai:matter_fluid_zero 64000'], itemOutputs: ['1x gt_shanhai:integrated_assembly_matrix'], EUt: uv, duration: 200, conditions: ["16x dishanhai:wzgl"] },
  { id: 'primordial_matter_recombination_integrated_assembly_facility', type: 'primordial_matter_recombination', itemInputs: [ '32x gtceu:uv_machine_hull', '8x kubejs:uv_universal_circuit', '128x dishanhai:light_voyage', '64x dishanhai:genesis_shard', '32x gtceu:uv_robot_arm', '32x gtceu:uv_emitter', '1x dishanhai:worldline_boundless_singularity' ], inputFluids: ['dishanhai:matter_fluid_zero 128000'], itemOutputs: ['1x gt_shanhai:integrated_assembly_facility'], EUt: uv, duration: 200, conditions: ["32x dishanhai:wzgl"] },
  { id: 'primordial_matter_recombination_singularity_data_hub', type: 'primordial_matter_recombination', itemInputs: [ '16x gtceu:uv_machine_hull', '8x kubejs:uv_universal_circuit', '64x dishanhai:light_voyage', '64x dishanhai:navigate_prism', '16x gtceu:uv_sensor', '16x gtceu:uv_emitter', '1x dishanhai:worldline_boundless_singularity' ], inputFluids: ['dishanhai:matter_fluid_zero 64000'], itemOutputs: ['1x gt_shanhai:singularity_data_hub'], EUt: uv, duration: 200, conditions: ["16x dishanhai:wzgl"] },
  { id: 'primordial_matter_recombination_space_scaler', type: 'primordial_matter_recombination', itemInputs: [ '16x gtceu:uv_machine_hull', '4x kubejs:uv_universal_circuit', '64x dishanhai:light_voyage', '32x dishanhai:genesis_shard', '16x gtceu:uv_field_generator', '1x dishanhai:worldline_imaginary_string' ], inputFluids: ['dishanhai:matter_fluid_zero 64000', 'gtceu:spacetime 32000'], itemOutputs: ['1x gt_shanhai:space_scaler'], EUt: uv, duration: 200, conditions: ["16x dishanhai:wzgl"] },
  // ★★★ 新修改 · UV 级多方块建材（assembler条件已移除） ★★★
  { id: 'assembler_casing_quantum_glass', type: 'assembler', itemInputs: [ '64x gtceu:fusion_glass', '4x kubejs:uv_universal_circuit', '16x dishanhai:light_voyage' ], inputFluids: ['dishanhai:matter_fluid_zero 32000'], itemOutputs: ['64x gt_shanhai:casing_quantum_glass'], EUt: uv, duration: 200 },
  { id: 'assembler_casing_rhenium', type: 'assembler', itemInputs: [ '32x gtceu:uv_machine_hull', '16x gtceu:rhenium_plate', '8x dishanhai:light_voyage' ], inputFluids: ['dishanhai:matter_fluid_zero 32000'], itemOutputs: ['32x gt_shanhai:casing_rhenium'], EUt: uv, duration: 200 },
  { id: 'assembler_casing_transcendent', type: 'assembler', itemInputs: [ '64x gtceu:uv_machine_hull', '16x dishanhai:genesis_shard', '16x dishanhai:light_voyage' ], inputFluids: ['dishanhai:matter_fluid_zero 64000'], itemOutputs: ['64x gt_shanhai:casing_transcendent'], EUt: uv, duration: 200 },
  { id: 'assembler_casing_molecular', type: 'assembler', itemInputs: [ '64x gtceu:uv_machine_hull', '16x dishanhai:light_voyage', '16x dishanhai:genesis_shard' ], inputFluids: ['dishanhai:matter_fluid_zero 64000'], itemOutputs: ['64x gt_shanhai:casing_molecular'], EUt: uv, duration: 200 },
  { id: 'assembler_casing_assembly', type: 'assembler', itemInputs: [ '32x gtceu:assembly_line_casing', '8x kubejs:uv_universal_circuit', '16x dishanhai:light_voyage' ], inputFluids: ['dishanhai:matter_fluid_zero 32000'], itemOutputs: ['32x gt_shanhai:casing_assembly'], EUt: uv, duration: 200 },
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
  // ★ 新修改：ku_ming_yuan_yang替代终焉矩阵，材料流体翻倍
  { id: 'matter_module_casting_create_mk', type: 'matter_module_casting', itemInputs: [ '1x dishanhai:reality_anchor_module', '1x dishanhai:reality_core', '1x dishanhai:annihilation_core', '1x dishanhai:universal_parallel_overdriver', '1x dishanhai:ku_ming_yuan_yang', '1x gt_shanhai:spacetime_wave_matrix', '1x dishanhai:halo_end', '1x dishanhai:collapse_tear', '1x dishanhai:bridge_and_gate', '1x dishanhai:gate_and_bridg', '1x dishanhai:csj', '1x dishanhai:big_tear', '48x dishanhai:wl_board_eternal', '8x dishanhai:singularity_ring', '32x dishanhai:finality_certificate', '128x dishanhai:blue_son' ], inputFluids: [ 'dishanhai:matter_fluid_ultimate 2048000', 'dishanhai:stabilized_eternity 1024000', 'dishanhai:primal_chaos 1024000', 'dishanhai:causal_essence 1024000' ], itemOutputs: ['1x dishanhai:create_mk'], EUt: MAX, duration: 400 },
  // ★ 新修改：matter_forging→primordial_matter_recombination，配方更复杂
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
  // ★ 新修改：SOC简化，wzcz3催化剂+prepared_cosmic_soc_wafer ★
  { id: 'primordial_matter_recombination_soc', type: 'primordial_matter_recombination', notConsumable: ['dishanhai:wzcz3'], itemInputs: [ '1x kubejs:prepared_cosmic_soc_wafer', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:stabilized_eternity 128000'], itemOutputs: ['1x dishanhai:soc'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_seventy_two_changes', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:wanxiang_core', '1x dishanhai:reality_core', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 256000', 'dishanhai:causal_essence 256000'], itemOutputs: ['1x gt_shanhai:seventy_two_changes'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_world_line_stripping_oscillation_generator', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:universal_parallel_overdriver', '4x dishanhai:thread_shard_7', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'dishanhai:causal_essence 256000'], itemOutputs: ['1x gt_shanhai:world_line_stripping_oscillation_generator'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_maintenance_hatch_max', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:reality_core', '4x dishanhai:singularity_ring', '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'dishanhai:stabilized_eternity 256000'], itemOutputs: ['1x gt_shanhai:maintenance_hatch'], EUt: MAX, duration: 200, conditions: ["64x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_primordial_engine_core', type: 'primordial_matter_recombination', itemInputs: [ '64x dishanhai:primordial_divergence_heart', '4x dishanhai:thread_shard_7', '16x dishanhai:wl_board_eternal', '16x dishanhai:singularity_ring' ], inputFluids: ['dishanhai:matter_fluid_ultimate 512000', 'dishanhai:causal_essence 256000'], itemOutputs: ['1x dishanhai:primordial_engine_core'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_bhd_hyper_seed', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:artificial_neutron_star', '1x dishanhai:gravitational_lens', '4x dishanhai:singularity_ring', '64x dishanhai:blue_son' ], inputFluids: ['dishanhai:primal_chaos 256000', 'dishanhai:stabilized_eternity 128000'], itemOutputs: ['4x dishanhai:bhd_hyper_seed'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  { id: 'primordial_matter_recombination_bhd_collapser', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:bhd_hyper_seed', '1x dishanhai:annihilation_core', '1x dishanhai:strong_interaction_droplet', '4x dishanhai:singularity_ring' ], inputFluids: ['dishanhai:matter_fluid_ultimate 256000', 'dishanhai:causal_essence 128000'], itemOutputs: ['1x dishanhai:bhd_collapser'], EUt: MAX, duration: 200, conditions: ["32x dishanhai:wzyh"] },
  // ★★★ 新修改 · 引力子碎片 ★★★
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
  // ★ 新修改：数据模块配方已移除模块条件 ★
  { id: 'assembler_eternal_workshop_data_module', type: 'assembler', itemInputs: [ '16x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '4x gtceu:data_module', '4x dishanhai:finality_certificate' ], inputFluids: ['dishanhai:causal_essence 64000'], itemOutputs: ['1x gt_shanhai:eternal_workshop_data_module'], EUt: MAX, duration: 200 },
  { id: 'primordial_matter_recombination_shanhai_nine_industrial', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:universal_parallel_overdriver', '1x dishanhai:reality_anchor_module', '1x dishanhai:annihilation_core', '1x dishanhai:wanxiang_core', '1x gt_shanhai:seventy_two_changes', '4x dishanhai:singularity_ring', '32x dishanhai:wl_board_eternal', '64x dishanhai:blue_son', '32x dishanhai:finality_certificate' ], inputFluids: ['dishanhai:matter_fluid_ultimate 2048000', 'dishanhai:stabilized_eternity 512000', 'dishanhai:causal_essence 512000', 'dishanhai:primal_chaos 512000'], itemOutputs: ['1x gt_shanhai:shanhai_nine_industrial'], EUt: MAX, duration: 600, conditions: ["64x dishanhai:wzyh"] },
  // ★ 新修改：create_mk→universal_parallel_overdriver，不再是最终物品作原料
  { id: 'primordial_matter_recombination_central_finite_curve', type: 'primordial_matter_recombination', itemInputs: [ '1x dishanhai:universal_parallel_overdriver', '1x dishanhai:cshx', '1x dishanhai:primordial_engine_core', '1x dishanhai:reality_core' ], inputFluids: ['dishanhai:matter_fluid_ultimate 1024000', 'dishanhai:causal_essence 1024000'], itemOutputs: ['1x dishanhai:central_finite_curve'], EUt: MAX, duration: 400 },
  // ===== 永恒格雷工坊建材配方（MAX级组装机，批量产出） =====
  // ★ 新修改：已移除组装机的模块条件(conditions) ★
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
DShanhaiRecipeEngine.precache([myRecipes, suprecipes_1, assemblerRecipes]);

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

    //终焉波动矩阵测试配方（使用 distort 配方类型）
    safeAddRecipe('distort', 'gt_shanhai:test_recipe', () => {
    gtr.distort('gt_shanhai:test_recipe')
        .itemInputs('dishanhai:crystal_matrix_ingot')
        .itemOutputs('dishanhai:crystal_matrix_ingot')
        .blastFurnaceTemp(9000)
        .EUt(UV)
        .duration(200)
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
        console.log('没有有效的矿石产物输出，跳过配方');
        return;
    }

    safeAddRecipe('star_core_stripper', 'dishanhai:star_core_stripper_ores', function() {
        gtr.star_core_stripper('dishanhai:star_core_stripper_ores')
            .notConsumable('dishanhai:time_reversal_protocol')
            .circuit(3)
            .itemOutputs(outputStacks)
            .EUt(max)
            .duration(200);
        console.log('输出 ' + outputStacks.length + ' 种矿石产物（已排除杂质前缀）');
    },{defaultEnabled:false});
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
    var builder = gtr.star_core_stripper('dishanhai:star_core_stripper_fluid_2')
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
    // ★ 新修改：零点能输出 50→128000mb
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

    // ═══════════════════════════════════════════════════════════════
    // 天界星云零点虹吸枢纽 — IV 级配方
    // ═══════════════════════════════════════════════════════════════
    if (Platform.isLoaded('gt_shanhai') && gtr.nebula_siphoning) {

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
     

} else {
    console.log('§6[山海] §egt_shanhai 模组未加载，跳过相关配方§r');
}


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
    info('通用高级配方开始初始化🔓')
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
    let timer_sup = new Timer('通用高级配方添加');
    
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
    let suptimer = timer_sup.end();
    info(`🗓️ [山海的big私货] (通用)高级配方添加完毕 成功:${supSuccess} | 失败:${supFailed} | 耗时:${suptimer}ms`);


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
        info('🔌 检测到 appflux 模组，添加兼容配方');
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
    info('[山海的big私货] 量子虹吸矩阵配方添加开始🔓')
    const timer_voidflux_reaction = new Timer('量子虹吸矩阵')
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

let voidtimer = timer_voidflux_reaction.end()
    console.log(`[山海的big私货] 🗓️ 量子虹吸矩阵配方添加完毕 成功:${voidfluxSuccess} | 失败:${voidfluxFailed} | 耗时${voidtimer}ms`)

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
    info('🔌 检测到 gtl_extend 模组，添加扩展配方');
    
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
        info('🔌 检测到 mekanism 模组，添加创造级配方');
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
        info('🔌 检测到 fluxnetworks 模组，添加兼容配方');
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
info('山海的♾️级物品配方允许加载🔓');
const dishanhai_timer = new Timer('山海的♾️物品配方');

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

info(`🔓 山海自定义配方开始加载，共 ${dishanhairecipes.length} 个`);
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

var dishanhai_timer_end = dishanhai_timer.end();
info(`✔️ 山海自定义配方添加完成 | 成功: ${dishanhaiSucc} | 失败: ${dishanhaifail} | 耗时: ${dishanhai_timer_end}ms`);

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


    
const recipes = [
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
let timercre = new Timer('创始现实修改模块')

recipes.forEach(recipe => {
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

let timerce = timercre.end()
info(`[山海的big私货] 🗓️ 创始现实修改模块配方创建完毕 成功：${create_mk_Success} | 失败${create_mk_Failed} | 耗时${timerce}ms`)


    
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
info('🗓️ 电解机配方开始加载🔓')
const timer_electrolyzer = new Timer('电解机')
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
 
let timer_ele = timer_electrolyzer.end()
info(`🗓️ 电解机配方加载完毕 成功:${electrolyzerSuccess} | 失败:${electrolyzerFailed} | 耗时${timer_ele}ms`)
    
// ========== ae2_overclocked 模组配方 ==========
if (Platform.isLoaded('ae2_overclocked')){
    info('🔌 检测到 ae2_overclocked 模组，添加超频卡配方');
    
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
    const timer = new Timer('Mekanism配方删除模块');
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
    timer.end();
});


// ========== 物品标签修改 ==========
ServerEvents.tags('item', e => {
    const timer = new Timer('物品标签修改');
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
    
    timer.end();
});

// ========== 流体标签修改 ==========
ServerEvents.tags('fluid', e => {
    const timer = new Timer('流体标签修改');
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
    
    timer.end();
});

// ========== 批量物品标签删除 ========== tag删除 彻底移除隐患
ServerEvents.tags('item', event => {
    const timer = new Timer('批量物品标签删除');
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
    timer.end();
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

// ========== CellAPI 默认值系统集成（继承 safeAddRecipe 的配方启用/禁用检查） ==========
/**
 * 检查 CellAPI 配方是否应该在默认值系统中启用
 * 继承 safeAddRecipe 的 defaultEnabled 检查逻辑，支持 recipeLoadConfig 和 localRecipeDefaults
 * @param {string} recipeId - 配方ID
 * @param {boolean} [defaultEnabled] - 未设置配置文件/本地默认值时的回退值（默认 true）
 * @returns {boolean} true=启用, false=禁用
 */
function _isCellRecipeEnabled(recipeId, defaultEnabled) {
    // 1. 配置文件检查（最高优先级，与 safeAddRecipe 的 shanhaiRecipeLoadConfig 检查一致）
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

    // 2. 本地默认值检查（setLocalRecipeDefault 设置的，与 safeAddRecipe 的 localRecipeDefaults 共享）
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
    //    同步到 localRecipeDefaults + recipeControlAPI，行为与 safeAddRecipe 一致
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
        
        // ========== 默认值系统检查（继承 safeAddRecipe 的配方启用/禁用逻辑） ==========
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
        
        // ========== 默认值系统检查（继承 safeAddRecipe 的配方启用/禁用逻辑） ==========
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
    const timer = new Timer('超级AE包配方');
    info('📀 开始生成超级AE包配方...');
    
    const _GTV = Java.loadClass('com.gregtechceu.gtceu.api.GTValues').VA; var GTValues = [_GTV[0],_GTV[1],_GTV[2],_GTV[3],_GTV[4],_GTV[5],_GTV[6],_GTV[7],_GTV[8],_GTV[9],_GTV[10],_GTV[11],_GTV[12],_GTV[13],_GTV[14]];
    var VA = GTValues; var ULV=VA[0],LV=VA[1],MV=VA[2],HV=VA[3],EV=VA[4],IV=VA[5],LuV=VA[6],ZPM=VA[7],UV=VA[8],UHV=VA[9],UEV=VA[10],UIV=VA[11],UXV=VA[12],OpV=VA[13],MAX=VA[14];
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
    
    timer.end();

    
});

// ========== 物质操纵模块 ==========
ServerEvents.recipes(e => {
    const timer = new Timer('模块');
    info('🔧 开始注册物质操纵模块配方...');
    
    // 获取 GTValues 电压数组（与下方光子矩阵蚀刻配方使用相同方式）
    let _GTV = Java.loadClass('com.gregtechceu.gtceu.api.GTValues').VA;
    var GTValues = [_GTV[0],_GTV[1],_GTV[2],_GTV[3],_GTV[4],_GTV[5],_GTV[6],_GTV[7],_GTV[8],_GTV[9],_GTV[10],_GTV[11],_GTV[12],_GTV[13],_GTV[14]];
    let [ulv, lv, mv, hv, ev, iv, luv, zpm, uv, uhv, uev, uiv, uxv, opv, max] = GTValues;
    
    var gtr = e.recipes.gtceu;
    
    const recipes = [
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
    
    let successCount = 0;
    
    recipes.forEach(recipe => {
        try {
            let assembler = gtr[recipe.type](`dishanhai:${recipe.id}`);
            
            if (recipe.notConsumable) {
                assembler.notConsumable(recipe.notConsumable);
            }
            if (recipe.circuit !== null && recipe.circuit !== undefined) {
                assembler.circuit(recipe.circuit);
            }
            if (recipe.itemInputs && recipe.itemInputs.length > 0) {
                assembler.itemInputs.apply(assembler, recipe.itemInputs);
            }
            if (recipe.inputFluids && recipe.inputFluids.length > 0) {
                assembler.inputFluids.apply(assembler, recipe.inputFluids);
            }
            if (recipe.itemOutputs && recipe.itemOutputs.length > 0) {
                assembler.itemOutputs.apply(assembler, recipe.itemOutputs);
            }
            if (recipe.outputFluids && recipe.outputFluids.length > 0) {
                assembler.outputFluids.apply(assembler, recipe.outputFluids);
            }
            assembler.EUt(recipe.EUt).duration(recipe.duration);
            
            successCount++;
            debug(`✓ 批量配方: dishanhai:${recipe.id}`);
        } catch(err) {
            error(`✗ 批量配方失败: dishanhai:${recipe.id} - ${err.message}`);
        }
    });
    
    info(`批量初级物质操纵·组装机配方注册完成: 成功 ${successCount}/${recipes.length}`);
    timer.end();
});

// ========== 光子矩阵蚀刻配方 ==========
ServerEvents.recipes(e => {
    const timer = new Timer('光子矩阵蚀刻配方');
    info('🔬 开始注册光子矩阵蚀刻配方...');
    
    let _GTV = Java.loadClass('com.gregtechceu.gtceu.api.GTValues').VA; var GTValues = [_GTV[0],_GTV[1],_GTV[2],_GTV[3],_GTV[4],_GTV[5],_GTV[6],_GTV[7],_GTV[8],_GTV[9],_GTV[10],_GTV[11],_GTV[12],_GTV[13],_GTV[14]];
    let [, , , , , , , , , , uev, uiv, uxv, opv, max] = GTValues; 
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
        { input: 'kubejs:cosmic_soc_wafer', multiplier: 10, voltage: uev, suffix: '1' },
        { input: 'kubejs:cosmic_ram_wafer', multiplier: 25, voltage: uiv, suffix: '2' },
        { input: 'kubejs:supracausal_ram_wafer', multiplier: 50, voltage: uxv, suffix: '3' },
        { input: 'gtladditions:infinity_wafer', multiplier: 70, voltage: opv, suffix: '4' },
        { input: 'gtladditions:prepare_primary_soc_wafer', multiplier: 85, voltage: max, suffix: '5' },
        { input: 'dishanhai:soc', multiplier: 100, voltage: 65565 * max, suffix: '6' }
    ];
    
    let recipeCount = 0;
    
    waferTypes.forEach((wafer, index) => {
        const circuitNum = index + 1;
        
        batches.forEach(batch => {
            let outputCount = Math.floor(wafer.baseOutput * batch.multiplier);
            
            if (batch.suffix === '4' && wafer.id === 'soc') outputCount = 1344;
            if (batch.suffix === '4' && wafer.id === 'advanced_soc') outputCount = 672;
            if (batch.suffix === '5' && wafer.id === 'soc') outputCount = 960;
            if (batch.suffix === '5' && wafer.id === 'advanced_soc') outputCount = 960;
            
            try {
                gtr.photon_matrix_etch(`dishanhai:${wafer.id}_wafer_${batch.suffix}`)
                    .circuit(circuitNum)
                    .itemInputs(batch.input)
                    .itemOutputs(`${outputCount}x gtceu:${wafer.id}_wafer`)
                    .EUt(batch.voltage)
                    .duration(20);
                recipeCount++;
            } catch(err) {
                error(`光子矩阵配方失败: ${wafer.id}_${batch.suffix} - ${err.message}`);
                recipeStats++;
            }
        });
    });
  let photon_time= timer.end();
    info(`[山海的big私货] ✔️ 光子矩阵蚀刻配方注册完成 成功: ${recipeCount} 个 | | 失败：${recipeStats} | 耗时：${photon_time}ms`);
    
});

// ========== 维度聚焦激光蚀刻配方 ==========
ServerEvents.recipes(e => {
    const timer = new Timer('维度聚焦激光蚀刻配方');
    info('🔬 开始注册维度聚焦激光蚀刻配方...');
    
    let _GTV = Java.loadClass('com.gregtechceu.gtceu.api.GTValues').VA; var GTValues = [_GTV[0],_GTV[1],_GTV[2],_GTV[3],_GTV[4],_GTV[5],_GTV[6],_GTV[7],_GTV[8],_GTV[9],_GTV[10],_GTV[11],_GTV[12],_GTV[13],_GTV[14]];
    let [, , , , , , , , , , uev, uiv, uxv, opv, max] = GTValues;    var ULV=GTValues[0],LV=GTValues[1],MV=GTValues[2],HV=GTValues[3],EV=GTValues[4],IV=GTValues[5],LuV=GTValues[6],ZPM=GTValues[7],UV=GTValues[8],UHV=GTValues[9],UEV=GTValues[10],UIV=GTValues[11],UXV=GTValues[12],OpV=GTValues[13],MAX=GTValues[14];

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
        { input: 'kubejs:cosmic_soc_wafer', multiplier: 10, voltage: uev, suffix: '1' },
        { input: 'kubejs:cosmic_ram_wafer', multiplier: 25, voltage: uiv, suffix: '2' },
        { input: 'kubejs:supracausal_ram_wafer', multiplier: 50, voltage: uxv, suffix: '3' },
        { input: 'gtladditions:infinity_wafer', multiplier: 70, voltage: opv, suffix: '4' },
        { input: 'gtladditions:prepare_primary_soc_wafer', multiplier: 80, voltage: max, suffix: '5' },
        { input: 'dishanhai:soc', multiplier: 100, voltage: 65565 * max, suffix: '6' }
    ];
    
    let recipeCount = 0;
    
    waferTypes_2.forEach((wafer, index) => {
        const circuitNum = index + 1;
        
        batches_2.forEach(batch => {
            let outputCount = Math.floor(wafer.baseOutput * batch.multiplier);
            
            if (batch.suffix === '4' && wafer.id === 'soc') outputCount = 1344;
            if (batch.suffix === '4' && wafer.id === 'advanced_soc') outputCount = 672;
            if (batch.suffix === '5' && wafer.id === 'soc') outputCount = 960;
            if (batch.suffix === '5' && wafer.id === 'advanced_soc') outputCount = 960;
            
            try {
                gtr.dimensional_focus_engraving_array(`dishanhai:${wafer.id}_wafer_${batch.suffix}`)
                    .circuit(circuitNum)
                    .itemInputs(batch.input)
                    .itemOutputs(`${outputCount}x gtceu:${wafer.id}_wafer`)
                    .EUt(batch.voltage)
                    .duration(20);
                recipeCount++;
            } catch(err) {
                error(`维度聚焦配方失败: ${wafer.id}_${batch.suffix} - ${err.message}`);
            }
        });
    });
    
    info(`维度聚焦激光蚀刻配方注册完成: ${recipeCount} 个`);
    timer.end();
});

// ========== 星焰跃迁等离子体配方 ==========
ServerEvents.recipes(e => {
    const timer = new Timer('星焰跃迁等离子体配方');
    info('⭐ 开始注册星焰跃迁等离子体配方...');
    
    let _GTV = Java.loadClass('com.gregtechceu.gtceu.api.GTValues').VA; var GTValues = [_GTV[0],_GTV[1],_GTV[2],_GTV[3],_GTV[4],_GTV[5],_GTV[6],_GTV[7],_GTV[8],_GTV[9],_GTV[10],_GTV[11],_GTV[12],_GTV[13],_GTV[14]];
    let [, , , , , , , , , , uev, , , , ] = GTValues;
    var ULV=GTValues[0],LV=GTValues[1],MV=GTValues[2],HV=GTValues[3],EV=GTValues[4],IV=GTValues[5],LuV=GTValues[6],ZPM=GTValues[7],UV=GTValues[8],UHV=GTValues[9],UEV=GTValues[10],UIV=GTValues[11],UXV=GTValues[12],OpV=GTValues[13],MAX=GTValues[14];
    var gtr = e.recipes.gtceu;
    
    const recipes = [
        {id:'echoite_plasma', input: 'gtceu:echoite', output: 'gtceu:echoite_plasma', count: 10000, voltage: uev, name: '回响合金等离子体'},
        {id:'chaos_plasma', input: 'gtceu:chaos', output: 'gtceu:chaos_plasma', count: 10000, voltage: uev, name: '混沌物质等离子体'},
        {id:'adamantium', input: 'gtceu:adamantium', output: 'gtceu:adamantium_plasma', count: 10000, voltage: uev, name: '艾德曼合金等离子体'},
        {id:'legendarium_plasma', input: 'gtceu:legendarium', output: 'gtceu:legendarium_plasma', count: 10000, voltage: uev, name: '传奇合金等离子体'},
        {id: 'celestial_secret_plasma', input: 'gtceu:celestial_secret', output: 'gtceu:celestial_secret_plasma', count: 10000, voltage: uev, name: '天机等离子体'},
        {id: 'cosmic_mesh_plasma', input: 'gtceu:liquid_cosmic_mesh', output: 'gtceu:cosmic_mesh_plasma', count: 10000, voltage: uev, name: '寰宇织网等离子体'},
        {id: 'bwdhdwzdlzt', input: 'gtceu:instability', output: 'gtceu:instability_plasma', count: 10000, voltage: uev, name: '不稳定混沌物质等离子体'},
        {id: 'tear_plasma', input: 'gtceu:tear', output: 'gtceu:tear_plasma', count: 10000, voltage: uev, name: '撕裂等离子体'},
        {id: 'xtt', input: 'gtceu:astraltitanium', output: 'gtceu:astraltitanium_plasma', count: 10000, voltage: uev, name: '星体钛等离子体'},
        {id: 'jbl', input: 'gtceu:degenerate_rhenium_plasma', output: 'gtceu:liquid_degenerate_rhenium', count: 10000, voltage: uev, name: '简并铼流体'},
        {id: 'clhj', input: 'gtladditions:creon', output: 'gtladditions:creon_plasma', count: 10000, voltage: uev, name: '创律合金等离子体'},
        {id: 'dlzshjz', input: 'gtceu:crystalmatrix', output: 'gtceu:crystalmatrix_plasma', count: 10000, voltage: uev, name: '水晶矩阵等离子体'},
    ];
    
    let successCount = 0;
    
    recipes.forEach(recipe => {
        try {
            gtr.stellar_lgnition(`dishanhai:${recipe.id}`)
                .inputFluids(`${recipe.input} ${recipe.count}`)
                .outputFluids(`${recipe.output} ${recipe.count}`)
                .blastFurnaceTemp(10000)
                .EUt(recipe.voltage)
                .duration(20);
            successCount++;
            debug(`✓ ${recipe.name}: dishanhai:${recipe.id}`);
        } catch(err) {
            error(`✗ ${recipe.name} 失败: ${err.message}`);
        }
    });
    
    info(`星焰跃迁等离子体配方注册完成: 成功 ${successCount}/${recipes.length}`);
    timer.end();
});

// ========== 无限盘配方 ==========
ServerEvents.recipes(e => {
    const timer = new Timer('无限盘配方');
    info('💿 开始注册无限盘配方...');

    let VA = Java.loadClass('com.gregtechceu.gtceu.api.GTValues').VA;
    let [ulv, lv, mv, hv, ev, iv, luv, zpm, uv, uhv, uev, uiv, uxv, opv, max] = VA;    var ULV=VA[0],LV=VA[1],MV=VA[2],HV=VA[3],EV=VA[4],IV=VA[5],LuV=VA[6],ZPM=VA[7],UV=VA[8],UHV=VA[9],UEV=VA[10],UIV=VA[11],UXV=VA[12],OpV=VA[13],MAX=VA[14];

    var gtr = e.recipes.gtceu;
    
    console.log('[山海的big私货] 开始加载无限盘配方...');
    
    let loadedCount = 0;
    let errorCount = 0;
    
    const infinityCell = (type, id) => {
        return Item.of('expatternprovider:infinity_cell', `{"record":{"#c":"ae2:${type}","id":"${id}"}}`);
    };
    
    const assemblerRecipes = [
        { id: 'wxhjrl', itemInputs: [infinityCell('i', 'minecraft:cobblestone'), '21474836x gtceu:carbon_dust', '21474836x gtceu:sulfur_dust'], inputFluids: ['gtceu:rocket_fuel 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:rocket_fuel')], EUt: uv, duration: 20, name: '无限火箭燃料' },
        { id: 'pej', itemInputs: ['2147483647x gtceu:carbon_dust', 'gtlcore:cell_component_256m'], inputFluids: ['gtceu:rocket_fuel_h8n4c2o4 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:rocket_fuel_h8n4c2o4')], EUt: uv, duration: 20, name: '无限偏二甲肼' },
        { id: 'pr1', itemInputs: ['2147483647x gtceu:carbon_dust', 'gtlcore:256m_storage'], inputFluids: ['gtceu:rocket_fuel_rp_1 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:rocket_fuel_rp_1')], EUt: uv, duration: 20, name: '无限RP-1燃料' },
        { id: 'jbrl', itemInputs: ['2147483647x gtceu:carbon_dust', 'gtlcore:cell_component_256m'], inputFluids: ['gtceu:rocket_fuel_cn3h7o3 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:rocket_fuel_cn3h7o3')], EUt: uv, duration: 20, name: '无限硝酸甲肼' },
        { id: 'wxxnhjrl', itemInputs: [infinityCell('f', 'gtceu:rocket_fuel'), '2147483647x gtceu:enriched_naquadah_dust', '2147483647x gtceu:hmxexplosive_dust', '2147483647x minecraft:fire_charge', 'gtlcore:cell_component_256m'], itemOutputs: [infinityCell('f', 'gtceu:stellar_energy_rocket_fuel')], inputFluids: ['gtceu:stellar_energy_rocket_fuel 2147483647'], EUt: ULV, duration: 20, name: '无限星能燃料' },
        { id: 'buhuinian', itemInputs: ['128x gtlcore:cell_component_256m', '2147483647x gtceu:nan_certificate', '520x gtladditions:astral_array'], inputFluids: ['gtceu:periodicium 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:periodicium')], EUt: MAX, duration: 20, name: '无限周期元素' },
        { id: 'gkj', itemInputs: ['114514x gtceu:carbon_dust', '114514x gtceu:sodium_hydroxide_dust', '1145x gtceu:rutile_dust'], inputFluids: ['gtceu:photoresist 214748'], itemOutputs: [infinityCell('f', 'gtceu:photoresist')], EUt: MAX, duration: 20, name: '无限光刻胶' },
        { id: 'rhy', itemInputs: ['16x gtlcore:cell_component_256m', '648x kubejs:machine_casing_grinding_head'], inputFluids: ['gtceu:lubricant 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:lubricant')], EUt: ULV, duration: 20, name: '无限润滑油' },
        { id: 'jgztwxp', itemInputs: ['64x gtlcore:cell_component_256m', '2147483647x kubejs:machine_casing_grinding_head', '114514x gtlcore:world_fragments_overworld'], itemOutputs: [infinityCell('i', 'kubejs:machine_casing_grinding_head')], EUt: 114514, duration: 20, name: '无限坚固钻头' },
        { id: 'lingbing', itemInputs: ['2147483647x kubejs:dust_cryotheum', '2147483647x kubejs:dust_blizz'], inputFluids: ['kubejs:gelid_cryotheum 2147483647'], itemOutputs: [infinityCell('f', 'kubejs:gelid_cryotheum')], EUt: 2147483647, duration: 20, name: '无限极寒之凛冰' },
        { id: '16_water', itemInputs: ['64x gtlcore:cell_component_256m'], inputFluids: ['gtceu:grade_16_purified_water 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:grade_16_purified_water')], EUt: uev, duration: 20, name: '无限16级净化水' },
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
        { id: 'suprachronal_celestial_secret', itemInputs: ['131400x gtceu:celestial_secret_dust', '64x dishanhai:cosmic_probe_mk', '64x gtceu:magic_manufacturer', '64x gtceu:opv_field_generator', '32x gtceu:space_cosmic_probe_receivers'], inputFluids: ['gtceu:celestial_secret 2147483647', 'gtceu:periodicium 114514'], itemOutputs: [infinityCell('f', 'gtceu:celestial_secret')], EUt: opv, duration: 20, name: '无限天机' },
        { id: 'suprachronal_tear', itemInputs: ['131400x gtceu:tear_dust', '64x dishanhai:cosmic_probe_mk', '64x gtceu:magic_manufacturer', '64x gtceu:opv_field_generator', '32x gtceu:space_cosmic_probe_receivers'], inputFluids: ['gtceu:tear 2147483647'], itemOutputs: [infinityCell('f', 'gtceu:tear')], EUt: opv, duration: 20, name: '无限撕裂' },
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
    timer.end();
});









//此外不允许再添加配方
// ========== 玩家登录通知 ==========
PlayerEvents.loggedIn(event => {
    let player = event.player;
    
    // 延迟8秒确保统计已同步
    event.server.scheduleInTicks(160, () => {
        // 尝试从全局变量获取统计
        if (typeof global.shanhaiRecipeStats !== 'undefined' && 
            global.shanhaiRecipeStats && 
            global.shanhaiRecipeStats.loaded) {
            
            let stats = global.shanhaiRecipeStats;
            let total = stats.total;
            let success = stats.success;
            let failed = stats.failed;
            let Version_mod = DShanhaiRecipeEngine.getModVersion();
            // 发送统计信息给玩家
            player.tell(Component.gold("§m============= §l山海私货配方统计 §m=============="));
            
            if (total === 0) {
                player.tell(Component.yellow("§e⚠ 配方统计为空，可能加载异常"));
                player.tell(Component.yellow("§e💡 请检查服务端日志"));
                player.tell(Component.yellow("§e💽 第一次启动配方为空为正常情况 如果不是第一次启动，请检查服务端日志 "));
            } else if (failed === 0) {
                player.tell(Component.green(`§a✓ 配方库加载完成！`));
                player.tell(Component.green(`§a📦 成功加载: §e${success}§a 个配方`));
                player.tell(Component.yellow(`§e⚠ 已被禁用配方数量：${stats.disabled}`));
                player.tell(Component.green(`§a😋 配方库检测无报错 祝领航员航行无阻!`))
                player.tell(Component.green(`💽 当前神人私货版本:v${Version}`))
                player.tell(Component.green(`💽 当前gt_shanhai模组版本:v${Version_mod} `))
                player.tell(Component.green(`💽 当前API总控系统版本为${API_Version}`))
                player.tell(Component.green(`§a😊 欢迎来到GTL寰宇联合重工巨企`))
                player.tell(Component.green(`§a😭 老大我们这样熬夜写私货心脏真的不会自己先休息吗`))
            } else {
                player.tell(Component.yellow(`§e⚠ 配方加载完成（部分失败）`));
                player.tell(Component.green(`§a📦 总计: §e${total}§a 个配方`));
                player.tell(Component.green(`§a✓ 成功: §e${success}§a 个`));
                player.tell(Component.red(`§c✗ 失败: §e${failed}§c 个`));
                player.tell(Component.red(`⚠警告:配方库错误 反馈联系qq:1982932217`))
                player.tell(Component.green(`当前神人私货版本:v${Version}`))
                
                // 显示前3个错误
                if (stats.errors && stats.errors.length > 0) {
                    player.tell(Component.red("§c❌ 失败详情:"));
                    let showCount = Math.min(3, stats.errors.length);
                    for (let i = 0; i < showCount; i++) {
                        let err = stats.errors[i];
                        player.tell(Component.red(`  ${i+1}. §7[${err.type}] §c${err.name} - §e${err.error}`));
                    }
                    if (stats.errors.length > showCount) {
                        player.tell(Component.gray(`  §7... 还有 ${stats.errors.length - showCount} 个错误`));
                    }
                }
            }
            
            player.tell(Component.gold("§m==========================================="));
            
            if (failed > 0) {
                player.tell(Component.red("§c⚠ 部分配方加载失败，具体错误信息已在上方显示"));
                player.tell(Component.red('§c⚠ 日志路径:logs-kubejs-xxxxx.log'))
            }
        } else {
            player.tell(Component.yellow("§e⏳ 山海私货配方统计加载中，请稍后再试"));
        }
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
