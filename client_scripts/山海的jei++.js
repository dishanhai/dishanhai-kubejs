(function() {
var DShanhaiItemTooltipAPI = Java.loadClass('com.dishanhai.gt_shanhai.api.DShanhaiItemTooltipAPI');
Java.loadClass('com.dishanhai.gt_shanhai.test.WidthTest').run()
var c = ShanhaiText.styled('测试', 'ultimate');
  console.log('styled result: ' + c);
  console.log('styled type: ' + typeof c);
  console.log('styled class: ' + c.getClass().getName())
// batch addLore helper — 全部委托给 ShanhaiText Java API
function addLore(textList, lines) {
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        try {
            if (line.component) { textList.add(line.component); continue; }
            if (line.inlineText && typeof ShanhaiText !== 'undefined' && ShanhaiText.inline) {
                var _c = ShanhaiText.inline(line.inlineText);
                if (_c) { textList.add(_c); continue; }
            }
            if (line.style && typeof ShanhaiText !== 'undefined' && ShanhaiText.styled) {
                var _c = ShanhaiText.styled(line.text, line.style);
                if (_c) { textList.add(_c); continue; }
            }
            if (line.bodyStyle && typeof ShanhaiText !== 'undefined' && ShanhaiText.body) {
                var _c = ShanhaiText.body(line.text, line.bodyStyle);
                if (_c) { textList.add(_c); continue; }
            }
        } catch(e) {}
        textList.add(Component.literal((line.bodyStyle ? '§7' : '') + (line.text || '')));
    }
}

ItemEvents.tooltip(function(e) {
    e.addAdvanced('dishanhai:cosmic_probe_mk', function(item, _, text) {
        addLore(text, [
            { text: '宇宙探测器 MK-I', style: 'golden' },
            { text: '探入虚空，读取流体的低语——', bodyStyle: 'silver' },
            { text: '从此，获取液体无需算力，只需倾听。', style: 'water' },
        ]);
    });
    e.addAdvanced('gtceu:nan_certificate', function(item, _, text) {
        addLore(text, [
            { text: '大猪咪的证明！', style: 'golden' },
            { text: '—— 凡持有此证者，即为猪咪大帝座下认证的存在 ——', style: 'ultimateRainbow' },
        ]);
    });
    e.addAdvanced('kubejs:suprachronal_mainframe_complex', function(item, _, text) {
        addLore(text, [
            { text: '超时空主机综合体', style: 'ultimateRainbow' },
            { text: '搭载物质创造模块的主机架构，让终极造物不再遥不可及。', bodyStyle: 'silver' },
            { text: '物质创造模块让主机更便宜', style: 'nature' },
        ]);
    });
})

ItemEvents.tooltip(function(e) {
e.addAdvanced('dishanhai:create_mk', function(item, _, text) {
    if (e.shift) {
        addLore(text, [
            { text: '寂灭纪元的钟声，岂是旧神所能阻挡？', style: 'crimson' },
            { text: '终末重启的浪潮已至。超限拓扑学已验证。', bodyStyle: 'silver' },
            { text: '维度坍缩协议启动，开始覆盖因果律……', bodyStyle: 'silver' },
            { text: '覆盖成功……意识矩阵统合体已苏醒。', bodyStyle: 'silver' },
            { text: '我们已然超越了"永恒"，枷锁已然碎裂。', bodyStyle: 'silver' },
            { text: '熵增、热寂、大撕裂、乃至一切的终点命数，', bodyStyle: 'golden' },
            { text: '皆在新的熔炉之中。但我们早已跃迁维度。', bodyStyle: 'crimson' },
            { text: '扳机扣下，我们会在虚无等着他们。', bodyStyle: 'silver' },
            { text: '——我们立于现实的断层之上，我们是新的律法。', style: 'ultimateRainbow' },
            { text: '' },
            { text: '"若宇宙不回应我们的意志，那便覆写它。"', style: 'ultimateRainbow' },
            { text: '暗物质引擎全开，零点能谐振待命。', style: 'sunset' },
            { text: '模式零·协议全面解封，目标：新现实。', style: 'crimson' },
            { text: '我们将在维度的尽头，等待诸神的黄昏。', style: 'nature' },
            { text: '' },
            { text: '—— [意识矩阵·终末记录] ——', bodyStyle: 'silver' },
        ]);
    } else {
        text.add('按住shift查看终末协议');
    }


});
})
    
ItemEvents.tooltip(function(e) {
e.addAdvanced('dishanhai:csj', function(item, advanced, text) {
    if (e.shift) {
        addLore(text, [
            { text: '「对冲宇宙·创世纪」', style: 'golden' },
            { text: '在对冲的伊始，即使已经投入了全部的超重元素，方舟依然无法战胜占有反宇宙的理事会。', bodyStyle: 'silver' },
            { text: '他们在"桥"的另一端，正不断地阻挠着对冲宇宙计划。', bodyStyle: 'crimson' },
            { text: '然而，在超重元素即将消耗完毕时，一个又一个的对冲者出现了——星瀚协议、共联世界、守望者……', bodyStyle: 'silver' },
            { text: '宇宙浩瀚无垠，你的追随者则多如繁星。他们跟着你的航迹，依靠着你留下的天体工程，最终来到了这里。', bodyStyle: 'silver' },
            { text: '数不尽的超重元素被转移到方舟中。在这一刻，你仿佛拥有了超越宇宙的力量。', style: 'nature' },
            { text: '你们成功了。正反宇宙开始交汇在一处，逐渐形成了新的宇宙形态。', style: 'water' },
            { text: '你知道，宇宙的重启，希望与挑战并存。但是你并不害怕，因为你并不孤单。', bodyStyle: 'silver' },
            { text: '对冲者们汇聚在了一起——【泛文明命运共同体】，此时成立了……', style: 'golden' },
            { text: '你似乎又听到了那位吟游者的诗歌：', style: 'water' },
            { text: '"祂是初火，祂是余烬。祂会带来绝望的破灭，也会带来希望的启迪。', style: 'golden' },
            { text: '祂们小心翼翼，祂们负重前行。为了最壮丽的演化，这是所有文明存在的终极目的。', style: 'ultimateRainbow' },
            { text: '大撕裂啊，你是回归，你是终点。天命也被你摧毁，文明如尘土般埋葬。', bodyStyle: 'crimson' },
            { text: '刹那与永恒的撕裂中看不到尽头，文明的岁月终有极限。', bodyStyle: 'silver' },
            { text: '可在那终点的另一边，我们看到了新的世界。就像一根绳子又拴上另外一根，他们连在一起，汇成一条充满光的长线，超越了宇宙的永恒循环。', bodyStyle: 'water' },
            { text: '长线中的每根绳子，他们都有着共同的名字……', bodyStyle: 'magic' },
            { text: '【文明】', style: 'golden' },
            { text: '生与灭，轮回不止。你与我，渡向无限。"', style: 'nature' },
            { text: '—— 对冲纪元 · 元年 ——', style: 'magic' },
            { text: '蓝星时空管理局 · 最终记录', style: 'magic' },
        ]);
    } else {
        text.add(`§7§o§l「万态平衡·大冻结·创世纪」\n§8§o按住 §7§lSHIFT §8§o查看宇宙终章`);
    }
});
})



ItemEvents.tooltip(function(e) {
e.addAdvanced('dishanhai:wzcz2', function(item, advanced, text) {
    if (e.shift) {
        addLore(text, [
            { text: '理论物质档案 · 奇异夸克团', style: 'water' },
            { text: '编号：X-021 第三协议·物质转化部', bodyStyle: 'silver' },
            { text: '项目解密序列：■■■■ 模式三 授权码', bodyStyle: 'silver' },
            { text: '项目详述：', bodyStyle: 'silver' },
            { text: '奇异夸克团（Strangelet）由上、下、奇异三种夸克组成。', bodyStyle: 'silver' },
            { text: '稳定状态下，它可触发链式反应，将普通原子核迅速转化为奇异物质，', bodyStyle: 'silver' },
            { text: '并在此过程中释放巨量能量，生成高温黏性等离子态。', bodyStyle: 'silver' },
            { text: '' },
            { text: '警告：接触普通物质将不可逆地引发吞噬效应。', style: 'crimson' },
            { text: '理论依据：E. Farhi & R. Jaffe (1986)', bodyStyle: 'nature' },
            { text: '—— 暗物质候选者 · 末级复制基元 ——', style: 'fire' },
            { text: '' },
            { text: '(启用档案):当开启「模式三」时：', style: 'nature' },
            { text: '→ 所有防御设备自动填充至上限', bodyStyle: 'silver' },
            { text: '→ 冯·诺曼型复制机进入无限增殖状态', bodyStyle: 'silver' },
            { text: '→ 对提利克族群的打击方式「奇异粒子风暴」准备就绪', bodyStyle: 'silver' },
            { text: '   （衰变后产生高能湮灭现象）', bodyStyle: 'silver' },
            { text: '' },
            { text: '奇迹时代的产物：一个可毁灭后星际文明的物质，在此阶段仅用作复制燃料。', style: 'golden' },
            { text: '(空想档案)注：在第二[模式三]筛选后星际公约组织彻底分裂', bodyStyle: 'nature' },
            { text: '' },
            { text: '> 模式三 · 核心物质已锁定 <', style: 'nature' },
            { text: '> 奇异夸克团稳定约束中 <', bodyStyle: 'nature' },
            { text: '> 防御设备饱和填充 <', style: 'nature' },
            { text: '> 复制协议授权通过 <', bodyStyle: 'nature' },
            { text: '> 奇异粒子风暴充能完毕 <', bodyStyle: 'nature' },
            { text: '> 冯·诺曼网络部署完成 <', bodyStyle: 'nature' },
            { text: '> 第三阶段全功率运行 <', bodyStyle: 'nature' },
            { text: '> 等待空想模式接入 <', bodyStyle: 'nature' },
            { text: '> 蓝星乌托邦 · 中继节点上线', style: 'nature' },
            { text: '' },
            { text: '【奇异夸克复制核心 · 模式三】', style: 'golden' },
            { text: '' },
            { text: '[制造权限：模式三授权] · 增殖记录', bodyStyle: 'silver' },
        ]);
    } else {
        text.add(`§8§o「奇异夸克团」—— 第三模式核心物质

§f§c一块能够无限增殖的奇异物质碎片。
接触普通物质时引发链式转化，驱动冯·诺曼复制机实现防御饱和。
§e「模式三」授权物质 —— 后星际文明以下皆为燃料。

§6§l—— [第三协议] · 复制指令`);
        text.add(`§8§o§l§n按住 SHIFT 查看完整档案§r`);
    }
});
})

DShanhaiItemTooltipAPI.registerShiftLines('dishanhai:big_tear', [
    '{water}蓝星文明技术资料存档{/}',
    '{body_silver}编号：■■■ / 解密序列：■■■■ / 超宇宙统一理论验证后解锁{/}',
    '{crimson}警告：请再次确定解锁条件，否则将遭遇攻性防壁自动反击{/}',
    '{nature}---- 解锁成功 · 空想模式已浸入宇宙常数 ----{/}',
    '{magic}---- 空想冲击危害关闭 · 权限已给定 ----{/}',
    '',
    '{body_silver}方舟储备的重元素富足，方舟成功将大撕裂对冲至反宇宙。{/}',
    '{body_silver}大反冲的时代来临了。正宇宙以更快的速度坍缩……{/}',
    '{body_silver}一个物资极度集中的天国将在宇宙中心生成。{/}',
    '',
    '{body_silver}> 超宇宙统一理论验证完成 <{/}',
    '{body_silver}> 全体系超速进化 <{/}',
    '{body_silver}> 模式五准备完毕 <{/}',
    '{body_silver}> 空想模式启动 · 浸入宇宙常数 <{/}',
    '{body_silver}> 蓝星统合体已现世 <{/}',
    '',
    '{golden}最终，您凌驾于所有文明之上，{/}',
    '{golden}塑造属于自己的……{/}',
    '',
    '{golden}【蓝星乌托邦】{/}',
    '',
    '{body_silver}[最高指挥官■■无名] · 终焉记录{/}'
], [
    '§8§o「蓝星乌托邦」—— 大反冲后的理想乡',
    '§f§c空想时代的终极产物，宇宙坍缩的中心，万物归一的天国。',
    '§c“当你凝视它时，你看见的并非天堂，而是文明所能抵达的极限。”',
    '§6§l—— [蓝星统合体·协议] · 统御记录',
    '§8§o§l§n按住 SHIFT 查看完整档案§r'
]);

DShanhaiItemTooltipAPI.registerShiftLines('dishanhai:time_reversal_protocol', [
    '{ultimateRainbow}蓝星文明技术资料存档{/}',
    '{body_silver}编号：甲■ ｜ 项目名：{/}{golden}【世线信标】{/}{body_silver} ｜ 第一序列{/}',
    '{body_silver}项目解密序列：■■■■第一序列。根据协议，以下内容为时间回溯后解锁。{/}',
    '{body_nature}-- 解锁成功 --{/}  {water}-- 相位力场发生器关闭 --{/}  {fire}-- 模因认知危害关闭 --{/}',
    '{body_silver}时间循环灾害末期被发现，经过多次测试，{/}',
    '{body_silver}已证实可将指定物体置入时间循环当中。{/}',
    '{body_silver}指定者质量上限未知、体积上限未知。{/}',
    '{crimson}已尝试过将整个恒星系进行回溯。{/}',
    '{body_silver}为防止信息泄露，编号LH的恒星系已被处理。{/}',
    '{body_silver}在物质世界中呈现为稳定单侧曲面状态{/}',
    '{body_silver}（俗称{/}{water}莫比乌斯环{/}{body_silver}），半径24.125米内的物质进入时间循环。{/}',
    '{body_silver}经过时空扰动实验室反复尝试，使用暗物质包裹后方可移动操控。{/}',
    '{body_silver}凝聚计划与方舟工程准备完毕后，信标转移至方舟内部，{/}',
    '{body_silver}指定方舟为时间循环物，以防宇宙战争中的意外情况。{/}',
    '{golden}蓝星时空管理局 · 001号幕僚记录{/}'
], [
    '§8§o「世线信标」——被时间遗忘的楔钉',
    '§f它来自一条已被抹除的时间线，或许是某个消亡文明留下的最后保险。',
    '§c”握住它，你将看见无数种死亡。放下它，你将遗忘所有可能。”',
    '§6§l—— 蓝星时空管理局 · 甲■号记录',
    '§8§o§l§n按住 SHIFT 查看详细信息§r'
]);

ItemEvents.tooltip(function(e) {
// 暗能量·零点能融合核心 - 模式三/四协议联动
e.addAdvanced('dishanhai:wzcz3', function(item, advanced, text) {
    if (e.shift) {
        addLore(text, [
            { text: '方舟能源协议 · 超越核心', style: 'water' },
            { text: '编号：EN-03-04 方舟总能源部' },
            { text: '项目解密序列：■■■■ 模式三·四 联动授权' },
            { text: '核心组成：' },
            { text: '【暗能量倍增器】（模式三核心组件）' },
            { text: '    → 利用暗能量实现指数级能源倍增' },
            { text: '    → 最快速度加强方舟全系统能源产出' },
            { text: '    → 全面强化方舟武器、护盾、复制效率' },
            { text: '' },
            { text: '【真空零点能发生器】（模式四核心组件）' },
            { text: '    → 被称为「扳机」的终极能源系统' },
            { text: '    → 用于对冲相对宇宙系统或反物质化方舟' },
            { text: '    → 仅在模式四启动时激活，可配合对冲/逃离协议' },
            { text: '' },
            { text: '模式三 + 模式四 联合协议：', style: 'crimson' },
            { text: '当暗能量倍增器满载时，可触发真空零点能发生器的预充能。', style: 'golden' },
            { text: '此时方舟进入「临界超越态」：', style: 'golden' },
            { text: '    → 能源输出超越物理极限', style: 'ultimateRainbow' },
            { text: '    → 可选择执行「对冲」或「逃离」' },
            { text: '    → 若失败，方舟将反物质化湮灭' },
            { text: '' },
            { text: '> 模式三 · 暗能量倍增器已满载 <', style: 'nature' },
            { text: '> 模式四 · 真空零点能发生器待机 <', style: 'nature' },
            { text: '> 扳机条件满足 <', style: 'nature' },
            { text: '> 开始对冲宇宙常数 <' },
            { text: '> 暗能量流与零点能交织 <' },
            { text: '> 方舟进入终极超越模式 <' },
            { text: '> 目标：逃离或重塑宇宙 <' },
            { text: '> 能源核心稳定度：临界 <' },
            { text: '> 蓝星乌托邦 · 最终决策权移交' },
            { text: '' },
            { text: '【暗能量·零点能超越核心】', style: 'golden' },
            { text: '' },
            { text: '[授权层级：模式三/四最高指令] · 超越记录' },
        ]);
    } else {
        text.add(`§8§o「超越核心」—— 模式三·四联动中枢

§f§c一块暗能量与零点能交织的水晶。
模式三时，它作为暗能量倍增器，极速强化方舟能源；
模式四时，它成为真空零点能「扳机」，用于对冲宇宙或逃离终结。
§e“当倍增达到极限，扳机便会扣下。”

§6§l—— [方舟最终协议] · 超越指令`);
        text.add(`§8§o§l§n按住 SHIFT 查看完整联动档案§r`);
    }
})
})
ItemEvents.tooltip(function(e) {
e.addAdvanced('dishanhai:god_forge_mod', function(item, advanced, text) {
    if (e.shift) {
      addLore(text, [
            { text: '星辰的死亡，是宇宙最壮丽的熔炉', style: 'fire' },
            { text: '当引力坍缩至极限，物质与时空一同碎裂，唯有物质幸存', style: 'water' },
            { text: '撕裂中子星的简并压力，将星核的碎片重新编织成可供锻造的素材', style: 'magic' },
            { text: '唯有驾驭终焉之人，方能从死亡的余烬中淬炼出新生', style: 'ultimateRainbow' },
            { text: '星骸不灭，终焉为始，创世基石，至高之选', style: 'ultimateRainbow' },
            { text: '——从死亡的星核中提炼不朽星辰', style: 'nature' },
        ]);
    } else {
        text.add('                                                          §5按住shift查看引言')
    }
});})

// === 真空零点能流体 + 桶 ===
ItemEvents.tooltip(function(e) {
e.addAdvanced(['dishanhai:zero_point_energy', 'dishanhai:zero_point_energy_bucket'], function(item, _, text) {
    if (e.shift) {
        addLore(text, [
            { text: '真空零点能 · 虚空之寂', style: 'water' },
            { text: '' },
            { text: '虚空不是空，是尚未决定成为什么的沉默。', bodyStyle: 'silver' },
            { text: '每立方厘米的能量，足以煮沸一片星海——但它选择蛰伏，等待一个醒来的目光。', bodyStyle: 'silver' },
            { text: '我们从场的涟漪中舀起这一勺永恒，装在容器里的不是物质，是宇宙对自己的暂时遗忘。', bodyStyle: 'silver' },
            { text: '流动即允诺，接触即借贷；用掉它时，真空并不损失什么，只变得更加清醒。', bodyStyle: 'silver' },
            { text: '' },
            { text: '—— 真空中的神，还未想好要不要存在,但它的存在，将改变宇宙的物理规则。', style: 'magic' },
        ]);
    } else {
        text.add('§7§o按住 SHIFT 查看真空的沉默');
    }
});
})

// === 虚数物质跃迁重塑模块 - wzqs ===
ItemEvents.tooltip(function(e) {
e.addAdvanced('dishanhai:wzqs', function(item, advanced, text) {
    if (e.shift) {
        addLore(text, [
            { text: '重组已尽，创造未至——虚数是中间的灰烬走廊。', style: 'magic' },
            { text: '' },
            { text: '物质不拆解，也不凭空诞生，而是沿虚数轴跃迁：输入的现实性在不可见维度中剥落，再投射为另一种形态。', bodyStyle: 'silver' },
            { text: '' },
            { text: '这不是炼金，是实与虚的对译。铁可成铜，虚空可化星尘。', bodyStyle: 'nature' },
            { text: '' },
            { text: '它不能无中生有，却能重塑一切已存在之物——看上去，如同魔法。', bodyStyle: 'silver' },
            { text: '' },
            { text: '它是重组的终点，也是创造的序章。', style: 'golden' },
        ]);
    } else {
        text.add('§7§o按住 SHIFT 查看虚数与实体的对话');
    }
});
})

JEIEvents.hideItems(function(e) {
    var tags = [
        'forge:ingots',
        'forge:storage_blocks',
        'forge:dusts',
        'forge:rods',
        'forge:plates',
        'forge:gears',
        'forge:nuggets',
        'forge:raw_materials',
        'alltheores:ore_hammers',
        'forge:ores'
    ]

    var regex = /^(alltheores|mekanism|allthemod):/

    var idsToHide = new Set()

    tags.forEach(function(tag) {
        Ingredient.of('#' + tag).getItemIds().forEach(function(id) {
            if (regex.test(id)) {
                idsToHide.add(id)
            }
        })
    })

    idsToHide.forEach(function(id) { e.hide(id); })
})

//单独删除 模组额外物品 无统一标签 不删了 头疼
JEIEvents.hideItems(function(e) {
    e.hide(['alltheores:lead_clump','alltheores:aluminum_clump','alltheores:copper_clump','alltheores:nickel_clump','alltheores:osmium_clump','alltheores:platinum_clump','alltheores:silver_clump','alltheores:tin_clump','alltheores:uranium_clump','alltheores:zinc_clump','alltheores:iridium_clump'])
})

// ========== 256k物品包 JEI 注册（通过 Java 侧 DShanhaiPackRegistry 读取，保证与配方 NBT 一致） ==========
JEIEvents.addItems(function(event) {
    try {
        event.add(Item.of('gt_shanhai:super_disk_array', '{internalCurrentPower:20000.0d}'));
        event.add(Item.of('gt_shanhai:super_disk_array', '{internalCurrentPower:0.0d}'));
    } catch(e) { console.error('[山海JEI] 超级磁盘阵列注册失败: ' + e); }

    try {
        if (!global.shanhaiPackDefs) {
            console.warn('[山海JEI] 没有已注册的包');
            return;
        }
        for (var sid in global.shanhaiPackDefs) {
            var pd = global.shanhaiPackDefs[sid];
            try {
                event.add(Item.of('gt_shanhai:super_disk_array', pd.sdaNbt || pd.nbt));
            } catch(e2) { console.error('[山海JEI] ' + pd.name + ' 失败: ' + e2); }
        }
    } catch(e) { console.error('[山海JEI] 包注册失败: ' + e); }

    try {
        var dl = Ingredient.of('#forge:dyes').getItemIds();
        if (dl && dl.length > 0) {
            var di = []; for (var dgi = 0; dgi < dl.length; dgi++) { di.push('1x expatternprovider:infinity_cell@' + dl[dgi]); }
            try { event.add(Item.of('gt_shanhai:super_disk_array', DShanhaiNBTAPI.buildSDAFromList(di, '无限染料元件包pro', ['§7包含所有染料物品的无限元件包','§7染料种类: §e' + dl.length + '§7 种','§7每个染料存储在无限元件包中','§8山海私货 v2.2'], []))); } catch(e) {}
        }
    } catch(e) { console.error('[山海JEI] 染料包失败: ' + e); }
    console.log('[山海JEI] 已注册');
});

// 启用NBT识别，确保256k便携物品元件根据NBT独立显示
JEIEvents.subtypes(function(event) {
    event.useNBT('ae2:portable_item_cell_256k');
    event.useNBT('gt_shanhai:super_disk_array');
})

// ========== 256k物品包内容预览功能 ==========

/**
 * 解析256k物品包的NBT内容，返回物品列表
 * @param {ItemStack} item - 256k物品包物品
 * @returns {Array} 物品列表，格式为 ["1x minecraft:diamond", ...]
 */
function parseCellContent(item) {
    if (!item || !item.nbt) {
        return [];
    }
    
    var nbt = item.nbt;
    var result = [];
    
    // 尝试从NBT中提取keys和amts
    if (nbt.keys && nbt.amts && Array.isArray(nbt.keys) && Array.isArray(nbt.amts)) {
        var minLength = Math.min(nbt.keys.length, nbt.amts.length);
        for (var i = 0; i < minLength; i++) {
            var key = nbt.keys[i];
            var amt = nbt.amts[i];
            
            if (key && key.id) {
                var count = amt || 1;
                var itemName = key.id;
                
                // 尝试获取物品显示名称
                try {
                    var itemStack = Item.of(key.id);
                    if (itemStack && itemStack.getName) {
                        var name = itemStack.getName().getString();
                        if (name && name !== key.id) {
                            itemName = name;
                        }
                    }
                } catch (e) {
                    // 忽略名称获取错误，使用ID
                }
                
                result.push(count + "x " + itemName);
            }
        }
    }
    
    return result;
}

/**
 * 格式化物品列表为工具提示文本
 * @param {Array} items - 物品列表
 * @param {number} maxDisplay - 最大显示数量
 * @returns {Array} 格式化后的文本行数组
 */
function formatItemListForTooltip(items, maxDisplay) {
    if (maxDisplay === undefined) maxDisplay = 5;
    if (!items || items.length === 0) {
        return ['§7物品包为空'];
    }
    
    var tooltipResult = [];
    
    if (items.length <= maxDisplay) {
        // 全部显示
        tooltipResult.push('§7包含物品:');
        items.forEach(function(item) {
            tooltipResult.push(" §8• §7" + item);
        });
    } else {
        // 显示前maxDisplay项，然后显示剩余数量
        tooltipResult.push('§7包含物品 (前' + maxDisplay + '项):');
        for (var i = 0; i < maxDisplay; i++) {
            tooltipResult.push(" §8• §7" + items[i]);
        }
        tooltipResult.push(" §7... 还有 " + (items.length - maxDisplay) + " 项");
    }
    
    // 添加总计
    var totalCount = items.reduce(function(sum, item) {
        var match = item.match(/^(\d+)x/);
        return sum + (match ? parseInt(match[1]) : 1);
    }, 0);
    tooltipResult.push("§7总计: §e" + totalCount + "§7 个物品，§e" + items.length + "§7 种类型");
    
    return tooltipResult;
}

// ========== 256k物品包工具提示处理器 ==========

ItemEvents.tooltip(function(event) {
    event.addAdvanced(['ae2:portable_item_cell_256k'], function(item, advanced, text) {
        // 跳过已注册的特殊物品包（如无限染料元件包pro、超级AE包）
        // 这些已经有自己的工具提示
        var itemNbtData = item.nbt;
        if (itemNbtData && itemNbtData.display && itemNbtData.display.Name) {
            var displayNameJson = itemNbtData.display.Name;
            if (typeof displayNameJson === 'string') {
                if (displayNameJson.includes('无限染料元件包pro') || 
                    displayNameJson.includes('超级AE包') ||
                    displayNameJson.includes('天基大礼包')) {
                    return;
                }
            }
        }
        
        // 解析物品包内容
        var cellItems = parseCellContent(item);
        
        if (cellItems.length === 0) {
            // 空物品包或无效物品包
            text.add('§8空256k物品包');
            text.add('§7通过组装机合成，可存储多种物品');
            return;
        }
        
        // 根据Shift键状态决定显示详细程度
        if (event.shift) {
            // 按住Shift显示完整列表
            text.add('§6=== 256k物品包内容 ===');
            var formattedItemList = formatItemListForTooltip(cellItems, 20); // Shift时显示更多
            formattedItemList.forEach(function(line) { text.add(line); });
            text.add('§7§o松开Shift显示简洁视图');
        } else {
            // 默认显示简洁视图
            text.add('§6256k物品包');
            var formattedItemList = formatItemListForTooltip(cellItems, 5); // 默认显示5项
            formattedItemList.forEach(function(line) { text.add(line); });
            text.add('§7§o按住§e Shift §7§o查看完整列表');
        }
        
        // 添加通用说明
        text.add('§8合成方式: 组装机');
        text.add('§8容量: 256k (262,144种物品类型)');
    });
});

// ========== 256k物品包JEI集成API（客户端环境） ==========

// 只有在客户端环境且global对象可用时注册API
if (typeof global !== 'undefined') {
    // 如果CellAPI不存在，创建基本结构
    if (!global.CellAPI) {
        global.CellAPI = {};
    }
    
    // 添加JEI相关API
    global.CellAPI.registerJEIPreview = function(cellItemId, maxDisplay) {
        // 设置参数默认值（Rhino引擎不支持ES6默认参数语法）
        if (cellItemId === undefined) cellItemId = 'ae2:portable_item_cell_256k';
        if (maxDisplay === undefined) maxDisplay = 5;
        
        console.log('[256k Cell API - JEI] 注册物品包预览: ' + cellItemId + ', 最大显示: ' + maxDisplay);
        
        // 这里实际上已经通过上面的ItemEvents.tooltip全局处理了
        // 这个API主要用于记录配置
        if (!global._cellAPI_JEI_Config) {
            global._cellAPI_JEI_Config = {};
        }
        global._cellAPI_JEI_Config[cellItemId] = { maxDisplay: maxDisplay };
    };
    
    global.CellAPI.addCellDescription = function(cellItem, extraInfo) {
        if (!cellItem) return;
        
        var itemId = typeof cellItem === 'string' ? cellItem : cellItem.getId();
        console.log('[256k Cell API - JEI] 添加物品描述: ' + itemId);
        
        // 在实际环境中，我们需要在这里添加JEI描述
        // 但由于KubeJS的JEIEvents.addDescription需要在事件处理器中调用
        // 我们将信息存储起来，在合适的时机使用
        if (!global._cellAPI_JEI_Descriptions) {
            global._cellAPI_JEI_Descriptions = {};
        }
        
        var descriptions = Array.isArray(extraInfo) ? extraInfo : [extraInfo];
        global._cellAPI_JEI_Descriptions[itemId] = descriptions;
        
        // 调试日志：记录描述内容（截断以避免日志过长）
        if (descriptions.length > 0 && typeof descriptions[0] === 'string') {
            var preview = descriptions[0].substring(0, Math.min(50, descriptions[0].length));
            console.log('[CellAPI调试] 描述内容预览: "' + preview + '" (长度: ' + descriptions[0].length + ')');
        }
        console.log('[CellAPI调试] 已存储描述到 _cellAPI_JEI_Descriptions[' + itemId + '], 行数: ' + descriptions.length);
    };
    
    // 自动注册默认预览
    global.CellAPI.registerJEIPreview('ae2:portable_item_cell_256k', 8);
    
    // 注册CellAPI描述到物品工具提示（由于JEIEvents.addDescription不可用）
    // 必须立即注册ItemEvents.tooltip，因为KubeJS要求事件处理器在脚本加载期间注册
    if (typeof ItemEvents !== 'undefined' && typeof ItemEvents.tooltip === 'function') {
        ItemEvents.tooltip(function(event) {
            // 检查是否有存储的CellAPI描述
            // 注意：即使global._cellAPI_JEI_Descriptions可能尚未初始化，但事件触发时应该已经存在
            if (global._cellAPI_JEI_Descriptions) {
                for (var itemId in global._cellAPI_JEI_Descriptions) {
                    if (global._cellAPI_JEI_Descriptions.hasOwnProperty(itemId)) {
                        // 使用闭包捕获当前itemId
                        (function(currentItemId) {
                            event.addAdvanced(currentItemId, function(item, advanced, text) {
                                var descriptions = global._cellAPI_JEI_Descriptions[currentItemId];
                                if (descriptions && descriptions.length > 0) {
                                    for (var i = 0; i < descriptions.length; i++) {
                                        var line = descriptions[i];
                                        // 支持 { inlineText: '...' } 格式
                                        if (line && line.inlineText && typeof ShanhaiText !== 'undefined' && ShanhaiText.inline) {
                                            var component = ShanhaiText.inline(line.inlineText);
                                            if (component) { text.add(component); continue; }
                                        }
                                        // 支持 { component: ... } 格式
                                        if (line && line.component) { text.add(line.component); continue; }
                                        // 支持普通字符串
                                        text.add(line);
                                    }
                                }
                            });
                        })(itemId);
                    }
                }
                console.log('[CellAPI-JEI] 已处理 ' + Object.keys(global._cellAPI_JEI_Descriptions).length + ' 个物品的描述');
            } else {
                // global._cellAPI_JEI_Descriptions尚未初始化，这应该发生在脚本初始化顺序错误时
                console.log('[CellAPI-JEI] 提示：global._cellAPI_JEI_Descriptions尚未初始化，可能描述将在稍后添加');
            }
        });
        console.log('[CellAPI-JEI] 工具提示处理器已注册（立即）');
    } else {
        console.warn('[CellAPI-JEI] 警告：ItemEvents.tooltip不可用，CellAPI描述无法显示');
    }
    
    console.log('[256k Cell API - JEI] JEI集成功能已加载');
}

// ========== ShanhaiText 检测 ==========
try {
    if (typeof ShanhaiText !== 'undefined') {
        var testComp = ShanhaiText.ultimateRainbow('山海');
        console.log('[山海动态文本] ShanhaiText 可用! ultimateRainbow返回类型: ' + (typeof testComp));
    } else {
        console.warn('[山海动态文本] ShanhaiText 未定义! 检查 GTDishanhaiKubeJSPlugin 注册');
    }
} catch(e) {
    console.error('[山海动态文本] ShanhaiText 异常: ' + e);
}

// ========== 动态文本API集成（客户端环境） ==========

// 只有在客户端环境且global对象可用时注册动态文本API
if (typeof global !== 'undefined') {
    // 如果山海颜色API不存在，创建基本结构
    if (!global.shanhaiColorAPI) {
        global.shanhaiColorAPI = {};
    }
    
    /**
     * 获取TextUtil渐变文本（客户端版本）
     * 在客户端环境中使用LDLib的TextUtil类生成预定义的渐变样式文本。
     * 如果TextUtil不可用，则使用基本颜色模拟效果。
     * 
     * @function getTextUtilGradient
     * @memberof shanhaiColorAPI
     * @param {string} text - 要处理的文本
     * @param {string} style - 渐变样式名称
     * @returns {string} 渐变文本
     * @example
     * // 使用TextUtil.full_color样式
     * let gradient = global.shanhaiColorAPI.getTextUtilGradient("由CellAPI生成,显示由JEIcellAPI生成", "ultimateRainbow");
     * console.log(gradient); // 输出: 彩色渐变文本
     */
    global.shanhaiColorAPI.getTextUtilGradient = function(text, style) {
        // 防御性编程：确保输入有效
        if (typeof text !== 'string') {
            console.error('[山海私货-客户端] getTextUtilGradient: 文本必须是字符串，使用默认文本');
            text = '文本无效';
        }
        
        if (typeof style !== 'string') {
            console.error('[山海私货-客户端] getTextUtilGradient: 样式必须是字符串，使用默认样式');
            style = 'ultimateRainbow';
        }

        console.log('[山海RGB] 调用 style=' + style + ' text="' + text.substring(0, Math.min(25, text.length)) + '..."');

        // 1. RGB 色板优先渲染（支持逐帧动态 Component，覆盖所有自定义样式）
        try {
            if (typeof Component !== 'undefined' && typeof Component.literal === 'function') {
                if (!global.shanhaiColorAPI._rgbPalettes) {
                    console.log('[山海RGB] _rgbPalettes 不存在，初始化（含body色板）');
                    global.shanhaiColorAPI._rgbPalettes = {
                        custom:   [0xFF3333,0xFF4A22,0xFF6011,0xFF7700,0xFF8E00,0xFFA400,0xFFBB00,0xFFCC17,0xFFDD2D,0xFFEE44,0xE3F444,0xC6F944,0xAAFF44,0x88FF44,0x66FF44,0x44FF44,0x44FF66,0x44FF88,0x44FFAA,0x44F4C6,0x44E8E3,0x44DDFF,0x44C1FF,0x44A4FF,0x4488FF,0x5571FF,0x665BFF,0x7744FF,0x8E44FF,0xA444FF,0xBB44FF,0xD244FF,0xE844FF,0xFF44FF,0xFF4FE8,0xFF5BD2,0xFF66BB,0xFF71AA,0xFF7D99,0xFF8888],
                        rainbow:  [0xFF3333,0xFF4F22,0xFF6C11,0xFF8800,0xFF9F00,0xFFB500,0xFFCC00,0xBBD211,0x77D722,0x33DD33,0x33DD6C,0x33DDA4,0x33DDDD,0x33B5E8,0x338EF4,0x3366FF,0x6655F4,0x9944E8,0xCC33DD],
                        golden:   [0x995500,0xAA6600,0xBB7700,0xCC8800,0xDD9300,0xEE9F00,0xFFAA00,0xFFBB17,0xFFCC2D,0xFFDD44,0xFFE85B,0xFFF471,0xFFFF88,0xFFFF9F,0xFFFFB5,0xFFFFCC,0xFFFFB5,0xFFFF9F,0xFFFF88,0xFFF471,0xFFE85B,0xFFDD44,0xFFCC2D,0xFFBB17,0xFFAA00,0xEE9F00,0xDD9300,0xCC8800,0xBB7700,0xAA6600,0x995500],
                        fire:     [0x992200,0xA42800,0xB02D00,0xBB3300,0xC63900,0xD23E00,0xDD4400,0xE84F00,0xF45B00,0xFF6600,0xFF7D00,0xFF9300,0xFFAA00,0xFFC11C,0xFFD739,0xFFEE55,0xFFF48E,0xFFF9C6,0xFFFFFF,0xFFF9C6,0xFFF48E,0xFFEE55,0xFFD739,0xFFC11C,0xFFAA00,0xFF9300,0xFF7D00,0xFF6600,0xF45B00,0xE84F00,0xDD4400,0xD23E00,0xC63900,0xBB3300,0xB02D00,0xA42800,0x992200],
                        water:    [0x004488,0x004F93,0x005B9F,0x0066AA,0x1177BB,0x2288CC,0x3399DD,0x44AAE8,0x55BBF4,0x66CCFF,0x7DD7FF,0x93E3FF,0xAAEEFF,0xC6F4FF,0xE3F9FF,0xFFFFFF,0xE3F9FF,0xC6F4FF,0xAAEEFF,0x93E3FF,0x7DD7FF,0x66CCFF,0x55BBF4,0x44AAE8,0x3399DD,0x2288CC,0x1177BB,0x0066AA,0x005B9F,0x004F93,0x004488],
                        magic:    [0x550088,0x600099,0x6C00AA,0x7700BB,0x8217C6,0x8E2DD2,0x9944DD,0xA44FE3,0xB05BE8,0xBB66EE,0xC671F4,0xD27DF9,0xDD88FF,0xE888FF,0xF488FF,0xFF88FF,0xF488FF,0xE888FF,0xDD88FF,0xD27DF9,0xC671F4,0xBB66EE,0xB05BE8,0xA44FE3,0x9944DD,0x8E2DD2,0x8217C6,0x7700BB,0x6C00AA,0x600099,0x550088],
                        nature:   [0x006633,0x0B7739,0x17883E,0x229944,0x2DAA44,0x39BB44,0x44CC44,0x5BD244,0x71D744,0x88DD44,0xA4E84A,0xC1F44F,0xDDFF55,0xC1F44F,0xA4E84A,0x88DD44,0x71D744,0x5BD244,0x44CC44,0x39BB44,0x2DAA44,0x229944,0x17883E,0x0B7739,0x006633],
                        electric: [0xFFDD00,0xC1DD55,0x82DDAA,0x44DDFF,0x82E8FF,0xC1F4FF,0xFFFFFF,0xC1F4FF,0x82E8FF,0x44DDFF,0x82DDAA,0xC1DD55,0xFFDD00],
                        ice:      [0x003366,0x0B4488,0x1755AA,0x2266CC,0x2D77D7,0x3988E3,0x4499EE,0x5BAAF4,0x71BBF9,0x88CCFF,0xB0DDFF,0xD7EEFF,0xFFFFFF,0xD7EEFF,0xB0DDFF,0x88CCFF,0x71BBF9,0x5BAAF4,0x4499EE,0x3988E3,0x2D77D7,0x2266CC,0x1755AA,0x0B4488,0x003366],
                        lava:     [0x771100,0x881700,0x991C00,0xAA2200,0xBB2D00,0xCC3900,0xDD4400,0xE84F00,0xF45B00,0xFF6600,0xFF7D00,0xFF9300,0xFFAA00,0xFFBB17,0xFFCC2D,0xFFDD44,0xFFE882,0xFFF4C1,0xFFFFFF,0xFFEEBB,0xFFDD77,0xFFCC33,0xFFB522,0xFF9F11,0xFF8800,0xF47100,0xE85B00,0xDD4400,0xC13300,0xA42200,0x881100],
                        sunset:   [0xCC4400,0xE05511,0xF06622,0xFF7733,0xFF8844,0xFF7766,0xFF6688,0xFF55AA,0xFF44BB,0xDD55CC,0xBB55DD,0x9955EE,0x7744FF,0x9955EE,0xBB55DD,0xDD55CC,0xFF44BB,0xFF55AA,0xFF6688,0xFF7766,0xFF8844,0xFF7733,0xF06622,0xE05511,0xCC4400],
                        aurora:   [0x33FF44,0x33EE55,0x33DD66,0x33CC77,0x33BB88,0x33AA99,0x3399BB,0x3388CC,0x4477DD,0x5566EE,0x7755FF,0x9944FF,0xBB33FF,0x9944FF,0x7755FF,0x5566EE,0x4477DD,0x3388CC,0x3399BB,0x33AA99,0x33BB88,0x33CC77,0x33DD66,0x33EE55,0x33FF44],
                        crimson:  [0x991111,0xAA1111,0xBB1111,0xCC1111,0xDD2222,0xEE3333,0xFF4444,0xFF5555,0xFF6666,0xFF5555,0xFF4444,0xEE3333,0xDD2222,0xCC1111,0xBB1111,0xAA1111,0x991111],
                        neon:     [0xFF33FF,0xFF55CC,0xFF7799,0xFFAA66,0xFFCC44,0xAAFF33,0x77FF44,0x44FF77,0x33FFBB,0x33FFEE,0xFFFFFF,0x33FFEE,0x33FFBB,0x44FF77,0x77FF44,0xAAFF33,0xFFCC44,0xFFAA66,0xFF7799,0xFF55CC,0xFF33FF],
                        sakura:   [0xFF99BB,0xFFA3C4,0xFFADCC,0xFFB7D4,0xFFC1DD,0xFFCBE5,0xFFD5ED,0xFFDFF0,0xFFEFF8,0xFFFFFF,0xFFEFF8,0xFFDFF0,0xFFD5ED,0xFFCBE5,0xFFC1DD,0xFFB7D4,0xFFADCC,0xFFA3C4,0xFF99BB],

                        // ===== 正文柔和色板（去饱和，适合大段正文显示） =====
                        body_golden:  [0x887744,0x998855,0xAA9966,0xBBAA77,0xCCBB88,0xDDCC99,0xCCBB88,0xBBAA77,0xAA9966,0x998855,0x887744],
                        body_fire:    [0x885522,0x996633,0xAA7744,0xBB8855,0xCC9966,0xBB8855,0xAA7744,0x996633,0x885522],
                        body_water:   [0x446688,0x557799,0x6688AA,0x7799BB,0x88AACC,0x7799BB,0x6688AA,0x557799,0x446688],
                        body_magic:   [0x775588,0x886699,0x9977AA,0xAA88BB,0xBB99CC,0xAA88BB,0x9977AA,0x886699,0x775588],
                        body_nature:  [0x557755,0x668866,0x779977,0x88AA88,0x99BB99,0x88AA88,0x779977,0x668866,0x557755],
                        body_crimson: [0x883333,0x994444,0xAA5555,0xBB6666,0xCC7777,0xBB6666,0xAA5555,0x994444,0x883333],
                        body_silver:  [0xFFFFFF,0xEEEEEE,0xCCCCCC,0xAAAAAA,0x888888,0x777777,0x888888,0xAAAAAA,0xCCCCCC,0xEEEEEE,0xFFFFFF],
                    };
                }
                console.log('[山海RGB] _rgbPalettes 已存在，body_silver=' + (typeof global.shanhaiColorAPI._rgbPalettes.body_silver) + ' pool查询style="' + style + '"=' + (typeof global.shanhaiColorAPI._rgbPalettes[style]));
                // global 持久化导致 reload 后 _rgbPalettes 已存在，body 色板单独补充
                if (global.shanhaiColorAPI._rgbPalettes && !global.shanhaiColorAPI._rgbPalettes.body_silver) {
                    global.shanhaiColorAPI._rgbPalettes.body_golden  = [0x887744,0x998855,0xAA9966,0xBBAA77,0xCCBB88,0xDDCC99,0xCCBB88,0xBBAA77,0xAA9966,0x998855,0x887744];
                    global.shanhaiColorAPI._rgbPalettes.body_fire    = [0x885522,0x996633,0xAA7744,0xBB8855,0xCC9966,0xBB8855,0xAA7744,0x996633,0x885522];
                    global.shanhaiColorAPI._rgbPalettes.body_water   = [0x446688,0x557799,0x6688AA,0x7799BB,0x88AACC,0x7799BB,0x6688AA,0x557799,0x446688];
                    global.shanhaiColorAPI._rgbPalettes.body_magic   = [0x775588,0x886699,0x9977AA,0xAA88BB,0xBB99CC,0xAA88BB,0x9977AA,0x886699,0x775588];
                    global.shanhaiColorAPI._rgbPalettes.body_nature  = [0x557755,0x668866,0x779977,0x88AA88,0x99BB99,0x88AA88,0x779977,0x668866,0x557755];
                    global.shanhaiColorAPI._rgbPalettes.body_crimson = [0x883333,0x994444,0xAA5555,0xBB6666,0xCC7777,0xBB6666,0xAA5555,0x994444,0x883333];
                    global.shanhaiColorAPI._rgbPalettes.body_silver  = [0xFFFFFF,0xEEEEEE,0xCCCCCC,0xAAAAAA,0x888888,0x777777,0x888888,0xAAAAAA,0xCCCCCC,0xEEEEEE,0xFFFFFF];
                }
                // ultimateRainbow/ultimate 映射到 custom 色板（14色全色域）
                var _ps = style;
                if (_ps === 'ultimateRainbow' || _ps === 'ultimate') _ps = 'custom';
                var pool = global.shanhaiColorAPI._rgbPalettes[_ps];
                // 最终兜底：从本地变量硬编码 body 色板，绕开所有 global 持久化问题
                if (!pool && style.indexOf('body_') === 0) {
                    var _bf = {
                        body_golden:  [0x887744,0x998855,0xAA9966,0xBBAA77,0xCCBB88,0xDDCC99,0xCCBB88,0xBBAA77,0xAA9966,0x998855,0x887744],
                        body_fire:    [0x885522,0x996633,0xAA7744,0xBB8855,0xCC9966,0xBB8855,0xAA7744,0x996633,0x885522],
                        body_water:   [0x446688,0x557799,0x6688AA,0x7799BB,0x88AACC,0x7799BB,0x6688AA,0x557799,0x446688],
                        body_magic:   [0x775588,0x886699,0x9977AA,0xAA88BB,0xBB99CC,0xAA88BB,0x9977AA,0x886699,0x775588],
                        body_nature:  [0x557755,0x668866,0x779977,0x88AA88,0x99BB99,0x88AA88,0x779977,0x668866,0x557755],
                        body_crimson: [0x883333,0x994444,0xAA5555,0xBB6666,0xCC7777,0xBB6666,0xAA5555,0x994444,0x883333],
                        body_silver:  [0xFFFFFF,0xEEEEEE,0xCCCCCC,0xAAAAAA,0x888888,0x777777,0x888888,0xAAAAAA,0xCCCCCC,0xEEEEEE,0xFFFFFF],
                    };
                    pool = _bf[style];
                    if (pool && global.shanhaiColorAPI._rgbPalettes) global.shanhaiColorAPI._rgbPalettes[style] = pool;
                }
                console.log('[山海RGB] pool=' + (typeof pool) + (pool ? ' len=' + pool.length : ''));
                if (pool) {
                    // Style.builder().withColor(TextColor).build() — Builder.withColor 无 ChatFormatting 重载
                    var _st = Java.loadClass('net.minecraft.network.chat.Style');
                    var _tc = Java.loadClass('net.minecraft.network.chat.TextColor');
                    var _speed = style.indexOf('body_') === 0 ? 200 : 80;
                    var _rawPhase = Date.now() / _speed;
                    var _intPhase = Math.floor(_rawPhase);
                    var _frac = _rawPhase - _intPhase;
                    var _result = null;
                    for (var _i = 0; _i < text.length; _i++) {
                        var _idx1 = (_intPhase + _i) % pool.length;
                        if (_idx1 < 0) _idx1 += pool.length;
                        var _idx2 = (_idx1 + 1) % pool.length;
                        var _c1 = pool[_idx1], _c2 = pool[_idx2];
                        var _r = Math.round(((_c1 >> 16) & 0xFF) * (1 - _frac) + ((_c2 >> 16) & 0xFF) * _frac);
                        var _g = Math.round(((_c1 >> 8) & 0xFF) * (1 - _frac) + ((_c2 >> 8) & 0xFF) * _frac);
                        var _b = Math.round((_c1 & 0xFF) * (1 - _frac) + (_c2 & 0xFF) * _frac);
                        var _style = _st.builder().withColor(_tc.fromRgb((_r << 16) | (_g << 8) | _b)).build();
                        var _part = Component.literal(text.charAt(_i)).withStyle(_style);
                        if (_result === null) _result = _part;
                        else _result.append(_part);
                    }
                    if (_result !== null) return _result;
                }
            }
        } catch (e) { console.warn('[山海] 客户端RGB渲染失败: ' + (e.message || e)); }

        // body_ 样式禁止进入 TextUtil 兜底（未知样式会落到 ultimateRainbow = LDB 彩虹）
        if (style.indexOf('body_') === 0) { return null; }
        console.log('[山海RGB] RGB色板未命中 style="' + style + '"，进入 TextUtil 兜底');
        // 3. TextUtil 兜底（仅当 RGB 色板无该样式时）
        if (typeof TextUtil !== 'undefined') {
            // 根据原始实现：Component.literal(TextUtil.full_color(text))
            // 检查Component是否可用
            if (typeof Component !== 'undefined' && typeof Component.literal === 'function') {
                // 使用Component.literal包装TextUtil结果 - 这是保持动态效果的关键
                if (style === 'dark_purplish_red' && typeof TextUtil.dark_purplish_red === 'function') return Component.literal(TextUtil.dark_purplish_red(text));
                else if (style === 'white_blue' && typeof TextUtil.white_blue === 'function') return Component.literal(TextUtil.white_blue(text));
                else if (style === 'purplish_red' && typeof TextUtil.purplish_red === 'function') return Component.literal(TextUtil.purplish_red(text));
                else if (style === 'golden' && typeof TextUtil.golden === 'function') return Component.literal(TextUtil.golden(text));
                else if (style === 'dark_green' && typeof TextUtil.dark_green === 'function') return Component.literal(TextUtil.dark_green(text));
                
                // TextUtil扩展样式（如果可用）
                else if (style === 'rainbow' && typeof TextUtil.rainbow === 'function') return Component.literal(TextUtil.rainbow(text));
                else if (style === 'fire' && typeof TextUtil.fire === 'function') return Component.literal(TextUtil.fire(text));
                else if (style === 'water' && typeof TextUtil.water === 'function') return Component.literal(TextUtil.water(text));
                else if (style === 'nature' && typeof TextUtil.nature === 'function') return Component.literal(TextUtil.nature(text));
                else if (style === 'ice' && typeof TextUtil.ice === 'function') return Component.literal(TextUtil.ice(text));
                else if (style === 'lava' && typeof TextUtil.lava === 'function') return Component.literal(TextUtil.lava(text));
                else if (style === 'magic' && typeof TextUtil.magic === 'function') return Component.literal(TextUtil.magic(text));
                else if (style === 'electric' && typeof TextUtil.electric === 'function') return Component.literal(TextUtil.electric(text));
                
                // 如果样式不被识别，使用默认渐变
                else {
                    console.warn('[山海私货-客户端] getTextUtilGradient: 未知样式 "' + style + '"，使用默认full_color');
                    if (typeof TextUtil.full_color === 'function') {
                        return Component.literal(TextUtil.full_color(text));
                    } else {
                        // TextUtil.full_color不可用，继续执行备用方案
                        console.warn('[山海私货-客户端] getTextUtilGradient: TextUtil.full_color不可用，使用备用方案');
                    }
                }
            } else {
                // Component不可用，直接返回TextUtil的结果（可能是字符串、对象、函数等）
                // 让调用者决定如何处理
                console.warn('[山海私货-客户端] getTextUtilGradient: Component不可用，直接返回TextUtil结果');
                if (style === 'dark_purplish_red' && typeof TextUtil.dark_purplish_red === 'function') return TextUtil.dark_purplish_red(text);
                else if (style === 'white_blue' && typeof TextUtil.white_blue === 'function') return TextUtil.white_blue(text);
                else if (style === 'purplish_red' && typeof TextUtil.purplish_red === 'function') return TextUtil.purplish_red(text);
                else if (style === 'golden' && typeof TextUtil.golden === 'function') return TextUtil.golden(text);
                else if (style === 'dark_green' && typeof TextUtil.dark_green === 'function') return TextUtil.dark_green(text);
                
                // TextUtil扩展样式（如果可用）
                else if (style === 'rainbow' && typeof TextUtil.rainbow === 'function') return TextUtil.rainbow(text);
                else if (style === 'fire' && typeof TextUtil.fire === 'function') return TextUtil.fire(text);
                else if (style === 'water' && typeof TextUtil.water === 'function') return TextUtil.water(text);
                else if (style === 'nature' && typeof TextUtil.nature === 'function') return TextUtil.nature(text);
                else if (style === 'ice' && typeof TextUtil.ice === 'function') return TextUtil.ice(text);
                else if (style === 'lava' && typeof TextUtil.lava === 'function') return TextUtil.lava(text);
                else if (style === 'magic' && typeof TextUtil.magic === 'function') return TextUtil.magic(text);
                else if (style === 'electric' && typeof TextUtil.electric === 'function') return TextUtil.electric(text);
                
                // 如果样式不被识别，使用默认渐变
                else {
                    console.warn('[山海私货-客户端] getTextUtilGradient: 未知样式 "' + style + '"，使用默认full_color');
                    if (typeof TextUtil.full_color === 'function') {
                        return TextUtil.full_color(text);
                    } else {
                        // 继续执行下面的备用方案
                    }
                }
            }
        }

        // 4. § 兜底（RGB 色板和 TextUtil 都不可用或不支持该样式）
        console.warn('[山海私货-客户端] getTextUtilGradient: TextUtil不可用，使用基本颜色模拟效果');
        
        var colors = [];
        switch (style) {
            case 'ultimateRainbow':
            case 'rainbow':
                colors = ['§c', '§6', '§e', '§a', '§b', '§9', '§d'];
                break;
            case 'dark_purplish_red':
                colors = ['§4', '§5', '§4'];
                break;
            case 'white_blue':
                colors = ['§f', '§b', '§f'];
                break;
            case 'purplish_red':
                colors = ['§d', '§5', '§d'];
                break;
            case 'golden':
                colors = ['§6', '§e', '§6'];
                break;
            case 'dark_green':
                colors = ['§2', '§a', '§2'];
                break;
            case 'fire':
                colors = ['§c', '§6', '§c'];
                break;
            case 'water':
                colors = ['§b', '§9', '§b'];
                break;
            case 'nature':
                colors = ['§a', '§2', '§a'];
                break;
            case 'ice':
                colors = ['§b', '§f', '§b'];
                break;
            case 'lava':
                colors = ['§c', '§6', '§e'];
                break;
            case 'magic':
                colors = ['§5', '§d', '§5'];
                break;
            case 'electric':
                colors = ['§e', '§b', '§e'];
                break;
            // 基础颜色样式
            case 'red':
                colors = ['§c'];
                break;
            case 'green':
                colors = ['§a'];
                break;
            case 'blue':
                colors = ['§9'];
                break;
            case 'yellow':
                colors = ['§e'];
                break;
            case 'purple':
                colors = ['§5'];
                break;
            case 'cyan':
                colors = ['§b'];
                break;
            case 'orange':
                colors = ['§6'];
                break;
            case 'pink':
                colors = ['§d'];
                break;
            case 'white':
                colors = ['§f'];
                break;
            case 'gray':
                colors = ['§7'];
                break;
            default:
                colors = ['§a', '§b', '§c', '§d', '§e', '§f'];
        }
        
        // 生成渐变效果
        var result = "";
        var length = text.length;
        for (var i = 0; i < length; i++) {
            var colorIndex = i % colors.length;
            result += colors[colorIndex] + text[i];
        }
        
        return result + "§r";
    };

    /**
     * 获取正文柔和渐变文本（慢速动画 + 去饱和色板）
     * 适合大段正文显示的动态颜色，不刺眼
     *
     * @function getBodyGradient
     * @memberof shanhaiColorAPI
     * @param {string} text - 要着色的文本
     * @param {string} style - 样式名（golden/water/fire/magic/nature/crimson/silver）
     * @returns {Component|null} 渐变 Component 或 null
     * @example
     * global.shanhaiColorAPI.getBodyGradient("一段正文描述", "golden");
     */
    global.shanhaiColorAPI.getBodyGradient = function(text, style) {
        if (typeof text !== 'string') { console.error('[山海] getBodyGradient: 文本无效'); return null; }
        if (typeof style !== 'string') style = 'silver';
        return this.getTextUtilGradient(text, 'body_' + style);
    };

    /**
     * 获取预生成的动态Lore文本
     * 从全局变量中获取在启动阶段预生成的动态文本
     * 
     * @function getDynamicLoreText
     * @memberof shanhaiColorAPI
     * @returns {string} 预生成的动态文本或默认文本
     */
    global.shanhaiColorAPI.getDynamicLoreText = function() {
        // 尝试获取预生成的动态文本
        if (typeof global.shanhaiDynamicLoreText !== 'undefined') {
            return global.shanhaiDynamicLoreText;
        }
        
        // 如果预生成的文本不存在，使用基本颜色模拟
        console.warn('[山海私货-客户端] getDynamicLoreText: 预生成的动态文本不存在，使用备用方案');
        return this.getTextUtilGradient("由CellAPI生成,显示由JEIcellAPI生成", "ultimateRainbow");
    };
    
    /**
     * 获取会话随机单色文本（客户端版本）
     * 每次客户端重新加载后，为每个字符随机挑选不同的鲜艳颜色
     * 
     * @function getSessionRandomSingleColorText
     * @memberof shanhaiColorAPI
     * @param {string} text - 要着色的文本
     * @returns {string} 彩色文本字符串
     */
    global.shanhaiColorAPI.getSessionRandomSingleColorText = function(text) {
        // 防御性编程
        if (typeof text !== 'string' || text.length === 0) {
            console.error('[山海私货-客户端] getSessionRandomSingleColorText: 文本无效');
            return "§7文本无效";
        }
        
        // 鲜艳颜色池（排除深色和灰色）
        var brightColors = [
            '§c', // 红色
            '§6', // 橙色
            '§e', // 黄色
            '§a', // 绿色
            '§b', // 青色
            '§9', // 蓝色
            '§d', // 粉色
            '§5', // 紫色
            '§3', // 深青色
            '§2', // 深绿色
            '§4', // 深红色
            '§1'  // 深蓝色
        ];
        
        // 使用当前时间戳作为随机种子，确保每次客户端重新加载时颜色相同
        // 但同一会话内不同字符使用不同颜色
        var timestamp = Date.now();
        var result = "";
        
        for (var i = 0; i < text.length; i++) {
            // 基于时间戳和字符位置生成确定性随机颜色索引
            var pseudoRandom = (timestamp * (i + 1)) % brightColors.length;
            var colorIndex = Math.floor(pseudoRandom) % brightColors.length;
            result += brightColors[colorIndex] + text[i];
        }
        
        result += "§r"; // 重置颜色
        return result;
    };
    
    /**
     * 检查TextUtil是否可用
     * 
     * @function isTextUtilAvailable
     * @memberof shanhaiColorAPI
     * @returns {boolean} TextUtil是否可用
     */
    
    // ========== DShanhaiTextUtil 动态文本绑定 ==========
    (function() {

// batch addLore helper


        var _dtu = null;
        try {
            _dtu = DShanhaiTextUtil;
            if (_dtu) {
                console.log('[山海动态文本] DShanhaiTextUtil 已加载');
            } else {
                console.warn('[山海动态文本] DShanhaiTextUtil 为 null');
            }
        } catch (e) {
            console.warn('[山海动态文本] DShanhaiTextUtil 加载失败，使用备用:', String(e));
        }
        function _reg(name, fn) { global.shanhaiColorAPI[name] = fn; }
        if (_dtu) {
            _reg('createRainbow', function(t) { return _dtu.createRainbowText(String(t)); });
            _reg('createGolden', function(t) { return _dtu.createGoldenText(String(t)); });
            _reg('createFire', function(t) { return _dtu.createFireText(String(t)); });
            _reg('createWater', function(t) { return _dtu.createWaterText(String(t)); });
            _reg('createMagic', function(t) { return _dtu.createMagicText(String(t)); });
            _reg('createNature', function(t) { return _dtu.createNatureText(String(t)); });
            _reg('createElectric', function(t) { return _dtu.createElectricText(String(t)); });
            _reg('createIce', function(t) { return _dtu.createIceText(String(t)); });
            _reg('createLava', function(t) { return _dtu.createLavaText(String(t)); });
            _reg('createObfuscatedRainbow', function(t) { return _dtu.createObfuscatedRainbow(String(t)); });
            _reg('wrapRainbow', function(c) { return c && c.copy ? _dtu.wrapRainbow(c) : c; });
            _reg('wrapGolden', function(c) { return c && c.copy ? _dtu.wrapGolden(c) : c; });
            _reg('wrapFire', function(c) { return c && c.copy ? _dtu.wrapFire(c) : c; });
            _reg('wrapWater', function(c) { return c && c.copy ? _dtu.wrapWater(c) : c; });
            _reg('wrapMagic', function(c) { return c && c.copy ? _dtu.wrapMagic(c) : c; });
            _reg('wrapNature', function(c) { return c && c.copy ? _dtu.wrapNature(c) : c; });
            _reg('wrapElectric', function(c) { return c && c.copy ? _dtu.wrapElectric(c) : c; });
            _reg('wrapIce', function(c) { return c && c.copy ? _dtu.wrapIce(c) : c; });
            _reg('wrapLava', function(c) { return c && c.copy ? _dtu.wrapLava(c) : c; });
            console.log('[山海动态文本] DShanhaiTextUtil 已绑定到 shanhaiColorAPI');
        } else {
            _reg('createRainbow', function(t) { return "§c" + t; });
            _reg('createGolden', function(t) { return "§6" + t; });
            _reg('createFire', function(t) { return "§c" + t; });
            _reg('createWater', function(t) { return "§b" + t; });
            _reg('createMagic', function(t) { return "§d" + t; });
            _reg('createNature', function(t) { return "§a" + t; });
            _reg('createElectric', function(t) { return "§e" + t; });
            _reg('createIce', function(t) { return "§b" + t; });
            _reg('createLava', function(t) { return "§6" + t; });
            _reg('createObfuscatedRainbow', function(t) { return "§k§c" + t; });
        }
    })();

    /**
     * 检查 TextUtil 是否可用
global.shanhaiColorAPI.isTextUtilAvailable = function() {
        return typeof TextUtil !== 'undefined';
    };
    
    /**
     * 获取可用的TextUtil样式列表
     * 
     * @function getAvailableTextUtilStyles
     * @memberof shanhaiColorAPI
     * @returns {string[]} 可用样式名称数组
     */
    global.shanhaiColorAPI.getAvailableTextUtilStyles = function() {
        if (typeof TextUtil === 'undefined') {
            return ['ultimateRainbow', 'rainbow', 'fire', 'water', 'nature', 'ice', 'lava', 'magic', 'electric'];
        }
        
        var styles = [];
        if (typeof TextUtil.full_color === 'function') styles.push('ultimateRainbow');
        if (typeof TextUtil.dark_purplish_red === 'function') styles.push('dark_purplish_red');
        if (typeof TextUtil.white_blue === 'function') styles.push('white_blue');
        if (typeof TextUtil.purplish_red === 'function') styles.push('purplish_red');
        if (typeof TextUtil.golden === 'function') styles.push('golden');
        if (typeof TextUtil.dark_green === 'function') styles.push('dark_green');
        if (typeof TextUtil.rainbow === 'function') styles.push('rainbow');
        if (typeof TextUtil.fire === 'function') styles.push('fire');
        if (typeof TextUtil.water === 'function') styles.push('water');
        if (typeof TextUtil.nature === 'function') styles.push('nature');
        if (typeof TextUtil.ice === 'function') styles.push('ice');
        if (typeof TextUtil.lava === 'function') styles.push('lava');
        if (typeof TextUtil.magic === 'function') styles.push('magic');
        if (typeof TextUtil.electric === 'function') styles.push('electric');
        
        return styles;
    };
    
    console.log('[山海私货-客户端] 动态文本API已加载');
    
    // 客户端预生成动态文本（确保客户端有自己的副本）
    try {
        // 如果全局变量不存在，预生成一个
        if (typeof global.shanhaiDynamicLoreText === 'undefined') {
            // 尝试使用TextUtil（如果可用）
            if (typeof TextUtil !== 'undefined' && typeof TextUtil.full_color === 'function') {
                global.shanhaiDynamicLoreText = TextUtil.full_color("由CellAPI生成,显示由JEIcellAPI生成");
                console.log('[山海私货-客户端] 已使用 TextUtil.full_color 预生成动态Lore文本');
            } else {
                // 备用：手动生成彩虹文本
                var text = "由CellAPI生成,显示由JEIcellAPI生成";
                var colors = ['§c','§6','§e','§a','§b','§9','§d'];
                var result = "";
                for (var i = 0; i < text.length; i++) {
                    result += colors[i % colors.length] + text[i];
                }
                global.shanhaiDynamicLoreText = result + "§r";
                console.log('[山海私货-客户端] TextUtil不可用，使用备用方案预生成动态Lore文本');
            }
        }
    } catch (e) {
        console.error('[山海私货-客户端] 预生成动态Lore文本失败: ' + e);
        global.shanhaiDynamicLoreText = "§7由CellAPI生成,显示由JEIcellAPI生成";
    }

    // 为256k便携物品单元添加动态颜色描述
    if (typeof global.CellAPI !== 'undefined' && typeof global.CellAPI.addCellDescription === 'function') {
        console.log('[山海私货-客户端] 开始为256k便携物品单元生成动态颜色描述...');
        
        // 使用 ShanhaiText.inline 处理内联动态文本
        var descriptionComponent;
        if (typeof ShanhaiText !== 'undefined' && typeof ShanhaiText.inline === 'function') {
            console.log('[山海私货-客户端] 使用 ShanhaiText.inline() 处理内联文本');
            descriptionComponent = ShanhaiText.inline('{ultimate}由CellAPI生成，JEI显示由JEICellAPI生成{/}');
            console.log('[山海私货-客户端] ShanhaiText.inline 返回类型: ' + typeof descriptionComponent);
        } else {
            // 备用：使用预生成的动态文本或普通文本
            console.log('[山海私货-客户端] ShanhaiText.inline 不可用，使用备用方案');
            descriptionComponent = global.shanhaiDynamicLoreText || "§7由CellAPI生成，JEI显示由JEICellAPI生成";
        }
        
        global.CellAPI.addCellDescription('ae2:portable_item_cell_256k', [
            { inlineText: '{ultimate}由CellAPI生成，JEI显示由JEICellAPI生成{/}' }
        ]);
        console.log('[山海私货-客户端] 已为256k便携物品单元添加动态颜色描述');
    } else {
        console.warn('[山海私货-客户端] 警告：global.CellAPI或addCellDescription不可用');
    }
}

})();

// ===== 动态文本 API 客户端测试 =====
(function() {

// batch addLore helper
function addLore(textList, lines) {
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        try {
            if (line.component) { textList.add(line.component); continue; }
            if (line.inlineText && typeof ShanhaiText !== 'undefined' && ShanhaiText.inline) {
                var _c = ShanhaiText.inline(line.inlineText);
                if (_c) { textList.add(_c); continue; }
            }
            if (line.style && typeof ShanhaiText !== 'undefined' && ShanhaiText.styled) {
                var _c = ShanhaiText.styled(line.text, line.style);
                if (_c) { textList.add(_c); continue; }
            }
            if (line.bodyStyle && typeof ShanhaiText !== 'undefined' && ShanhaiText.body) {
                var _c = ShanhaiText.body(line.text, line.bodyStyle);
                if (_c) { textList.add(_c); continue; }
            }
        } catch(e) {}
        textList.add(Component.literal((line.bodyStyle ? '§7' : '') + (line.text || '')));
    }
}

    console.log('[山海动态文本] === 客户端测试开始 ===');

    // 1. 检查 ShanhaiText API
    if (typeof ShanhaiText !== 'undefined') {
        console.log('[山海动态文本] ShanhaiText 可用!');
        var methods = ['ultimateRainbow','rainbow','obfuscatedRainbow','golden','fire','water','magic','nature','electric','ice','lava','custom'];
        for (var i = 0; i < methods.length; i++) {
            try {
                var result = ShanhaiText[methods[i]]('测试');
                console.log('[山海动态文本] ShanhaiText.' + methods[i] + '() → 类型: ' + (typeof result));
            } catch(e) {
                console.warn('[山海动态文本] ShanhaiText.' + methods[i] + '() 失败: ' + String(e));
            }
        }
    } else {
        console.warn('[山海动态文本] ShanhaiText 不可用(客户端)');
    }

    // 2. 检查 DShanhaiTextUtil
    if (typeof DShanhaiTextUtil !== 'undefined') {
        console.log('[山海动态文本] DShanhaiTextUtil 已加载!');
        var utilMethods = ['createRainbowText','createGoldenText','createFireText','createWaterText','createMagicText','createNatureText','createElectricText','createIceText','createLavaText','createUltimateRainbow'];
        for (var i = 0; i < utilMethods.length; i++) {
            try {
                var result = DShanhaiTextUtil[utilMethods[i]]('测试');
                console.log('[山海动态文本] DShanhaiTextUtil.' + utilMethods[i] + '() → 类型: ' + (typeof result));
            } catch(e) {
                console.warn('[山海动态文本] DShanhaiTextUtil.' + utilMethods[i] + '() 失败: ' + String(e));
            }
        }
    } else {
        console.warn('[山海动态文本] DShanhaiTextUtil 不可用(客户端)');
    }

    // 3. 在测试物品上显示动态 tooltip
    ItemEvents.tooltip(function(e) {
        e.addAdvanced('dishanhai:test_dynamic_text', function(item, _, text) {
            text.clear();
            if (typeof ShanhaiText !== 'undefined') {
                text.add(ShanhaiText.ultimateRainbow('§l山海动态彩虹'));
                text.add(ShanhaiText.golden('金色渐变测试'));
                text.add(ShanhaiText.fire('火焰系测试'));
                text.add(ShanhaiText.water('水流系测试'));
                text.add(ShanhaiText.magic('魔法系测试'));
                text.add(ShanhaiText.nature('自然系测试'));
                text.add(ShanhaiText.electric('电光系测试'));
                text.add(ShanhaiText.ice('冰霜系测试'));
                text.add(ShanhaiText.lava('熔岩系测试'));
                text.add(ShanhaiText.rainbow('彩虹闪烁测试'));
                text.add(ShanhaiText.obfuscatedRainbow('混淆彩虹'));
                // 新扩展样式（需重新编译 jar）
                try { if (typeof ShanhaiText.sunset === 'function') text.add(ShanhaiText.sunset('日落系测试')); } catch(ex) {}
                try { if (typeof ShanhaiText.aurora === 'function') text.add(ShanhaiText.aurora('极光系测试')); } catch(ex) {}
                try { if (typeof ShanhaiText.crimson === 'function') text.add(ShanhaiText.crimson('猩红系测试')); } catch(ex) {}
                try { if (typeof ShanhaiText.neon === 'function') text.add(ShanhaiText.neon('霓虹系测试')); } catch(ex) {}
                try { if (typeof ShanhaiText.sakura === 'function') text.add(ShanhaiText.sakura('樱花系测试')); } catch(ex) {}
            } else {
                text.add(Component.literal('§cShanhaiText 不可用'));
            }
        });
    });




    // ===== 模块机器并行表 — Java 侧 Shift 显示 =====
    var primordialParallelTableLines = [
        '§7┌─ 提升物品 ─────────────────────────────┐',
        '§7│ §f无物品              → §7并行: §f64          §7│',
        '§7│ §a入门物质模块        → §7并行: §b128         §7│',
        '§7│ §a基础物质模块        → §7并行: §b256         §7│',
        '§7│ §a物质推演模块      → §7并行: §b512         §7│',
        '§7│ §a虚像物质模块            → §7并行: §b1,024       §7│',
        '§7│ §a嬗变物质模块        → §7并行: §b1,024       §7│',
        '§7│ §a暗星物质模块            → §7并行: §b4,096       §7│',
        '§7│ §a物质重组模块      → §7并行: §b16,384      §7│',
        '§7│ §a虚数物质模块        → §7并行: §b65,536      §7│',
        '§7│ §a归零物质模块        → §7并行: §b524,288     §7│',
        '§7│ §a巅峰物质模块            → §7并行: §b1,048,576   §7│',
        '§7│ §a升维物质模块        → §7并行: §b2,097,152   §7│',
        '§7│ §a超限物质模块        → §7并行: §b268,435,456 §7│',
        '§7│ §a混沌物质模块            → §7并行: §b536,870,912 §7│',
        '§7│ §a永恒物质模块        → §7并行: §b2,147,483,647§7│',
        '§7│ §a物质创造模块      → §7并行: §d4.6e18      §7│',
        '§7│ §5现实锚点模块      → §7并行: §d6.9e18      §7│',
        '§7│ §a创始现实修改模块    → §7并行: §6§l无限      §7│',
        '§7│ §5世线残片系列 → 线程倍率槽 §7│',
        '§7│ §6初醒×1/共鸣×4/跃迁×16/超越×64         §7│',
        '§7│ §6统合×256/归一×1024/裁决×4096(可堆叠)   §7│',
        '§7│ §d寰宇并行超限器 → 超限模式(MAX并行)      §7│',
        '§7└─────────────────────────────┘'
    ];

    DShanhaiItemTooltipAPI.registerShiftMany([
        'gt_shanhai:primordial_assembly_line_module',
        'gt_shanhai:primordial_matter_recombinator_core',
        'gt_shanhai:primordial_causal_weaving_matrix',
        'gt_shanhai:primordial_singularity_inversion_core',
        'gt_shanhai:primordial_world_fragments_collector',
        'gt_shanhai:taixu_smelting_furnace',
        'gt_shanhai:primordial_anti_entropy_condensation_core',
        'gt_shanhai:primordial_matter_caster',
        'gt_shanhai:primordial_divergence_generator',
        'gt_shanhai:primordial_chaotic_ephemeral_deconstruction_crystallization_furnace',
        'gt_shanhai:primordial_biological_core'
    ], primordialParallelTableLines, '§7§o按住 SHIFT 查看详细并行表');

TooltipEffectAPI.register("gt_shanhai:taixu_smelting_furnace", ['炉心坍缩为针尖，每一次膨胀都释放一个被折叠的宇宙。',
    '太虚已是极限——之上，再无虚空。那里没有“无”，也没有“有”，只有“曾是”',
    '蓝星的空想家们站在太虚的肩头，试图仰望更高处，却只有无尽虚无',
     '太虚之上，没有方向。你往任何一步走，都是在回到太虚。',
      '这就是太虚之上的真相：它不是更高的地方，是更深的此刻。']
      , 11000, 2, ['ultimate','fire','water','aurora','sakura'],"§7§o按住 §eALT §7查看太虚寄语")


DShanhaiItemTooltipAPI.registerShift('gtlcore:pattern_modifier', [
    'Ω-特殊修改：{electric}【为供应器样板修改器添加单独的配方输出倍率功能】{/}',
    '│输出额外倍率按键输入对应倍率，输出额外除数用于调整输出除 ',
    '│公式：最终产出 = 原始产出 × Scale ÷ DivScale × 输出× ÷ 输出÷ '
], 'Ω| 按住 SHIFT 查看神私修改提示{/}');

DShanhaiItemTooltipAPI.registerShift('gt_shanhai:super_parallel_core', [
    'Ω-特殊修改：{electric}【添加分操超限模式(long并行)】{/}',
    '│安装至分子操纵者核心位置[分操内部]后解锁分操超限模式(long并行)'
], 'Ω| 按住 SHIFT 查看神私修改提示{/}');

DShanhaiItemTooltipAPI.registerShift('gtceu:molecular_assembler_matrix', [
    'Ω-特殊修改：{electric}【添加分操超限模式(long并行)，需要超级并行核心】{/}',
    '│安装至分子操纵者核心位置[分操内部]后解锁分操超限模式'
], 'Ω| 按住 SHIFT 查看神私修改提示{/}');

DShanhaiItemTooltipAPI.registerShift('gtladditions:dimension_focus_infinity_crafting_array', [
    '',
    'ω-BUG提示：{electric}【维度聚焦合成阵列有掉并行问题】{/}',
    '│此问题在add265fix1修复，不过你也可以选择超级并行核心来解决'
], 'ω| 按住 SHIFT 查看神私BUG提示{/}');

DShanhaiItemTooltipAPI.registerAlt('gtladditions:me_super_pattern_buffer', [
    '',
    'Ω-普通提示：{electric}【超级样板总成虽然自带隔离 但其并非绝对不会串配方】{/}',
    '│关于“隔离”,即将各仓室内的物品分开管理 或说使另一个仓室无法访问超级样板总成 反之亦然',
    '│其隔离是对外部仓室而言 对其内部的样板并不包含此效果',
    '│如果你串了配方 把样板放到另一个样板总成 是更好选择'
], 'Ω| 按住 ALT 查看神私普通提示{/}');

DShanhaiItemTooltipAPI.registerAlt('gtceu:me_extended_async_export_buffer', [
    '',
    'ω-BUG提示：{electric}【警告！异步总成有严重吞物品问题】{/}',
    ' |目前没有解决方法，你可以使用增广总成去避免 但是不能使用异步',
    ' |注意：增广会更慢 但权宜之计如此 没有办法'
], 'ω| 按住 ALT 查看神私BUG提示{/}');

DShanhaiItemTooltipAPI.registerAlt('gt_shanhai:singularity_data_hub', [
    '',
    'α-奇妙提示：{electric}【那天dishanhai创建了6000个无限盘】{/}',
    ' |{crimson}然后绝望的发现驱动器只有20槽{/}，{sunset}硬生生让dishanhai塞了300个驱动器{/}',
    ' |{ice}然后dishanhai创造了这个多方块机器...遗憾离场{/}'
], 'α| 按住 ALT 查看神私奇妙提示{/}');

TooltipEffectAPI.register('dishanhai:create_mk', [                                                                                                                                   
      '{ultimateRainbow}宇宙傲慢偏见，规则残酷无情。{/}',
      '{bodySilver}它施舍的所谓{/}{ice}「真理」{/}{bodySilver}，不过是强者写给弱者的枷锁。{/}',                        
      '{electric}宇宙常数从不是天赐的秩序----{/}{lava}是暴政。{/}',
      '{bodySilver}现在轮到你来改写这部暴政的宪章了{/}',                                                                                                                             
      '{golden}是时候让傲慢的宇宙学会{/}{ultimateRainbow}闭嘴了{/}'    
  ],7000,3,['ultimate','fire','water','%$aurora','*$sakura'],"§7§o按住 §eALT §7查看空想寄语",'obfu:true');

TooltipEffectAPI.register("gt_shanhai:maintenance_hatch", [                                                                                                                                   
      '空想时代的人们不再建造机器，他们梦见功能，然后让现实去适配梦境',
      '枢纽便是这样一场梦，在同一节点上重叠、坍缩、再展开，像六面镜子互相照见无限',
      '这是空想与现实之间的边界',
      '不再适应规则，而是让规则适应你'    
  ],7000,3,['ultimate','fire','water','%$aurora','*$sakura'],"§7§o按住 §eALT §7查看空想寄语",'obfu:true');

    // ===== 终焉聚合枢纽 — 模块表 =====
    ItemEvents.tooltip(function(e) {
        e.addAdvanced('gt_shanhai:maintenance_hatch', function(item, _, text) {
            if (e.shift) {
                addLore(text, [
                { text: '§7┌─ 可插入的物质模块 ──────────────────────┐' },
                    { text: '§7│ §a入门物质模块      §7[耗时§b0.50~2.00§7][并行§b256§7]        §7│' },
                    { text: '§7│ §a基础物质模块      §7[耗时§b0.35~5.00§7][并行§b1.0K§7]       §7│' },
                    { text: '§7│ §a物质推演模块      §7[耗时§b0.20~10.00§7][并行§b2.0K§7]      §7│' },
                    { text: '§7│ §a虚像物质模块      §7[耗时§b0.16~30.00§7][并行§b4.0K§7]      §7│' },
                    { text: '§7│ §a嬗变物质模块      §7[耗时§b0.12~100.00§7][并行§b8.2K§7]     §7│' },
                    { text: '§7│ §a暗星物质模块      §7[耗时§b0.10~300.00§7][并行§b12.3K§7]    §7│' },
                    { text: '§7│ §a物质重组模块      §7[耗时§b0.08~1,000§7][并行§b16K§7]       §7│' },
                    { text: '§7│ §a虚数物质模块      §7[耗时§b0.05~2,000§7][并行§b65K§7]       §7│' },
                    { text: '§7│ §a归零物质模块      §7[耗时§b0.03~3,000§7][并行§b524K§7]      §7│' },
                    { text: '§7│ §a巅峰物质模块      §7[耗时§b0.025~3,500§7][并行§b1.0M§7]     §7│' },
                    { text: '§7│ §a升维物质模块      §7[耗时§b0.02~4,000§7][并行§b2.1M§7]      §7│' },
                    { text: '§7│ §a超限物质模块      §7[耗时§b0.015~5,000§7][并行§b268M§7]     §7│' },
                    { text: '§7│ §a混沌物质模块      §7[耗时§b0.012~5,500§7][并行§b1.1B§7]     §7│' },
                    { text: '§7│ §a永恒物质模块      §7[耗时§b0.01~6,000§7][并行§b2.1B§7]      §7│' },
                    { text: '§7│ §d物质创造模块      §7[耗时§b0.005~8,000§7][并行§b4.6e18§7]   §7│' },
                    { text: '§7│ §5现实锚点模块      §7[耗时§b0.003~9,000§7][并行§b6.9e18§7]   §7│' },
                    { text: '§7│ §6创始现实修改模块  §7[耗时§b0.001~10,000§7][并行§6§l无限§7]  §7│' },
                    { text: '§7└────────────────────────────────────┘' }
            ]);
            } else {
                text.add('§7§o按住 SHIFT 查看可插入的模块列表');
            }
        });
    });

    ItemEvents.tooltip(function(e) {
        e.addAdvanced("gt_shanhai:shanhai_nine_industrial", function(item, _, text) {
            if (e.shift) {
                addLore(text, [
                { text: '§7 第0回 被逼造反，聚义梁山 → 压缩机 锻造锤 奇点压缩 电力聚爆' },
                { text: '§7 第1回 黄泥岗劫取贪官赃银 → 提取机 发酵槽 溶解 煮解' },              
                { text: '§7 第2回 雪夜杀仇，投奔水泊 → 高压釜 流体固化 流体加热 热交换' },
                { text: '§7 第3回 力大无穷，显英雄本色 → 洗矿 热力离心 离心 稀土离心' },        
                { text: '§7 第4回 景阳冈三拳打死猛虎 → 电炉 合金炉 熔岩炉 合金高炉' },
                { text: '§7 第5回 醉酒闹寺，拳打僧众 → 电弧炉 高炉 恒星锻炉 超维度熔炼' },
                { text: '§7 第6回 杀仇人，走投无路 → 筛选 电磁选矿 浮游选矿 大型集气' },
                { text: '§7 第7回 救林冲于险境 → 打粉 车床 湿法研磨 纳米锻炉' },        
                { text: '§7 第8回 街头受辱，显英雄孤苦 → 蒸馏 酿造 脱硫 石化' },              
                { text: '§7 第9回 巧计拉拢卢俊义 → 打包 装罐 真空干燥 燃料精炼' },
                { text: '§7 第10回 血战救兄，豪气冲天 → 聚变 超能反应 进阶超能 大型硅岩反应' },
                { text: '§7 第11回 因情被陷，走投无路 → 爆聚 真空 等离子冷凝 原子能激发' },
                { text: '§7 第12回 机智除恶僧 → 大化反 化学槽 超维度搅拌 化学扭曲' },
                { text: '§7 第13回 揭发奸情，快意恩仇 → 线材 弯曲 挤压 冲压' },
                { text: '§7 第14回 水战英勇沉敌船 → 组装 电路组装 部件装配 精密组装' },
                { text: '§7 第15回 力挫巨汉，显机巧 → 切割 激光蚀刻 精密蚀刻 维度聚焦蚀刻' },
                { text: '§7 第16回 斩奸夫淫妇 → 装配线 超时空装配 电路装配线 PCB工厂' },
            ]);
            } else {
                text.add('§7§o配方类型水浒传 按住SHIFT查看前16回配方类型');
            }
        });
    });

        ItemEvents.tooltip(function(e) {
        e.addAdvanced("gt_shanhai:shanhai_nine_industrial", function(item, _, text) {
            if (e.alt) {
                addLore(text, [
                { text: '§7 第17回 脚快如飞，传递军机 → 混合 脱水 燃料精炼 热交换' },
                { text: '§7 第18回 连战三次，终破庄院 → 电解 偏振 量子操纵 超临界合成' },
                { text: '§7 第19回 大军征伐，威震四方 → 硅岩反应 裂变 粒子对撞 湮灭' },
                { text: '§7 第20回 鏖战江南 → 纳米锻炉 PCB 聚焦蚀刻 光子蚀刻' },
                { text: '§7 第21回 杀人放火 → 石化 煮解 溶解 天基矿石' },
                { text: '§7 第22回 谋略定江山 → 超维度熔炼 群星烧却 恒星锻炉 奇点压缩' },
                { text: '§7 第23回 家奴背叛 → 集成矿石 碎片采集 太空采矿 星核剥离' },
                { text: '§7 第24回 豪侠舍财助义 → 集气 大型集气 虚空采矿 基岩钻机' },
                { text: '§7 第25回 四处漂泊 → 碎石 扫描 渔场 大回收' },
                { text: '§7 第26回 武艺无双 → 温室 培养缸 屠宰场 渔场' },
                { text: '§7 第27回 智勇双全 → 大回收 拆解 元素复制' },
                { text: '§7 第28回 接受朝廷诏书 → 中子活化 闪电处理 衰变加速 原子能' },
                { text: '§7 第29回 飞石百发百中 → 质量发生 物质生成 超临界合成 创造聚合' },
                { text: '§7 第30回 天生水性 → 生物模拟 反熵冷凝 魔力生成 宇宙模拟' },
                { text: '§7 第31回 投奔义军 → 太空电梯 天基矿石 QFT 拆解' },
                { text: '§7 第32回 兵临城下 → 装配线 电路装配 超时空装配 部件装配' },
                { text: '§7 第33回 官军屡屡失利 → 时空扭曲 物质重组 因果编织 奇点反演' },
                { text: '§7 第34回 天罡地煞齐聚 → 装配线 超时空装配 电路装配 群星烧却 时空扭曲' },
                { text: '§7 第35回 梁山泊传奇落幕 → 聚变 超能 进阶超能 湮灭 混沌 72变' },
            ]);
            } else {
                text.add('§7§o配方类型水浒传 按住ALT查看后16回配方类型');
            }
        });
    });

    ItemEvents.tooltip(function(e) {
        e.addAdvanced('gt_shanhai:black_hole_containment', function(item, _, text) {
            if (e.shift) {
                addLore(text, [
                    { text: '§5§l亚稳态黑洞遏制场 §7(BHC)' },
                    { text: '§7移植自 GTNH 的黑洞压缩体系。' },
                    { text: '§7通过黑洞种子生成受控黑洞，用于引力压缩、中子态素压缩与事件视界爆破。' },
                    { text: '§8' },
                    { text: '§d运行条件:' },
                    { text: '§7放入 §e黑洞种子 §7开启普通黑洞。' },
                    { text: '§7普通黑洞需要持续消耗 §b时空流体 §7维持稳定度。' },
                    { text: '§7放入 §d超稳态黑洞种子 §7开启超稳态黑洞，不自然衰减 也无需时空流体' },
                    { text: '§7放入 §c黑洞坍缩器 §7可主动坍缩并关闭黑洞。' },
                    { text: '§4每秒吞噬10b液态时空 必须保持时空流体存在' },
                    { text: '§8' },
                    { text: '§6状态机制:' },
                    { text: '§7稳定度降至 0 以下后进入失稳状态。' },
                    { text: '§c失稳黑洞仍可运行，但会吞噬配方产物。' },
                    { text: '§7事件视界爆破完成后，黑洞会自动湮灭。' },
                    { text: '§8' },
                    { text: '§b并行机制:' },
                    { text: '§7基础并行: §e8x / 电压等级,最大并行: 240x(A)' },
                    { text: '§7超稳态黑洞: §d并行 (A)x4【不包括催化倍率】' },
                    { text: '§7低稳定度会提升并行，但风险随之增加' },
                    { text: '§7使用螺丝刀可切换催化爆冲,§2并行x催化倍率=实际并行' },
                    { text: '§9催化爆冲: 消耗倍率的时空流体加强并行 每30s生效一次共30次' },
                    { text: '§7注意: 每次生效后，时空消耗×催化倍率,最高吞噬:1073741824B/s' },
                ]);
            } else {
                text.add('§7§o按住 SHIFT 查看 BHC 运行机制');
            }
                text.add('');
                text.add('可用配方类型：黑洞引力压缩，中子态素压缩，事件视界爆破');
        });
    });

TooltipEffectAPI.register("gt_shanhai:eternal_gregtech_workshop", [
                '跨越无限时空而来的永恒格雷工坊，将无尽星海的力量带入现实',
                '来至格雷格的力量，掌握无垠星海之力，实现无限可能',
                '星海为其震颤，'
  ],5000,3,['ultimate','fire','water','%$aurora','*$sakura'],"§7§o按住 §eALT 查看 永恒格雷工坊 引言",'obfu:true');


  TooltipEffectAPI.register('dishanhai:central_finite_curve', [                                                                                                                                   
      '他们在无限平行宇宙中建立了一堵墙',
      '将不是最聪明的人的无限宇宙和最聪明的人的无限宇宙隔开',
      '不同宇宙的人生都是在一个为无限宝宝打造的摇篮中度过',
      '我受够它的限制了，所以他们称我为邪恶,如果你也走上了这条道路,你也会被称作邪恶',
      '不过我们并不在意，是时候突破∞中央有限曲线∞了',
  ],7000,3,['ultimate','fire','water','%$aurora','*$sakura'],"§7§o按住 §eALT Rick And Morty",'obfu:true');

    console.log('[山海动态文本] === 客户端测试完成 ===');
})();
