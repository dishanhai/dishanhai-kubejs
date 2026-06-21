// ==================================================================
// 山海_配方规则管理.js — KubeJS 配方规则管理系统（方案A）
// 集中管理所有剥离/替换规则，支持正则、标签、批量操作。
// 作者: dishanhai | 依赖: gt_shanhai.jar (v2.1+)
// ==================================================================
// 使用方式:
//   1. 放入 server_scripts/ 目录
//   2. /kubejs reload 重载脚本
//   3. 规则在 ServerEvents.recipes 中自动执行
// ==================================================================

ServerEvents.recipes(function(event) {
  // 诊断: 打印可用的山海全局绑定
  console.log('[山海配方规则] global keys:', Object.keys(global).filter(k => k.toLowerCase().includes('shanhai') || k.toLowerCase().includes('recipe')))
  console.log('[山海配方规则] typeof ShanhaiRecipes:', typeof ShanhaiRecipes, 'typeof global.ShanhaiRecipes:', typeof global.ShanhaiRecipes)

  var R = global.ShanhaiRecipes || ShanhaiRecipes
  if (!R) {
    console.error('[山海配方规则] ShanhaiRecipes 未定义，跳过所有规则')
    return
  }

  // ========== 纳米锻造 · 透镜→电路替换 ==========
  // 将 26 种透镜全部替换为对应编号的编程电路
  var nanoLensMap = {
    'gtceu:light_gray_glass_lens':  1,
    'gtceu:emerald_lens':           2,
    'kubejs:non_linear_optical_lens': 3,
    'gtceu:lime_glass_lens':        4,
    'gtceu:diamond_lens':           5,
    'gtceu:blue_glass_lens':        6,
    'gtceu:yellow_glass_lens':      7,
    'gtceu:cyan_glass_lens':        8,
    'gtceu:light_blue_glass_lens':  9,
    'gtceu:light_green_glass_lens': 10,
    'gtceu:ruby_lens':              11,
    'gtceu:glass_lens':             12,
    'gtceu:orange_glass_lens':      13,
    'gtceu:brown_glass_lens':       14,
    'gtceu:nether_star_lens':       15,
    'gtceu:magenta_glass_lens':     17,
    'gtceu:sapphire_lens':          18,
    'gtceu:pink_glass_lens':        20,
    'gtceu:gray_glass_lens':        21,
    'gtceu:green_glass_lens':       22,
    'gtladditions:spacetime_lens':  23,
    'gtceu:purple_glass_lens':      24,
    'gtceu:red_glass_lens':         25,
    'gtceu:black_glass_lens':       26
  }

  for (var lens in nanoLensMap) {
    if (!nanoLensMap.hasOwnProperty(lens)) continue
    R.replaceWithCircuit('gtceu:nano_forge', lens, nanoLensMap[lens])
  }

  // 特定纳米虫群配方的特殊透镜（旧透镜在新透镜之上，单独匹配）
  R.replaceWithCircuit('gtceu:nano_forge', 'gtceu:light_blue_glass_lens', 9)
  R.replaceWithCircuit('gtceu:nano_forge', 'gtceu:light_green_glass_lens', 10)
  R.replaceWithCircuit('gtceu:nano_forge', 'gtceu:ruby_lens', 16)
  R.replaceWithCircuit('gtceu:nano_forge', 'gtceu:sapphire_lens', 19)

  // ========== 合金冶炼炉 · 剥离气体 ==========
  R.strip('gtceu:alloy_blast_smelter', '#forge:gases', true)

  // ========== 更多规则模板（按需取消注释） ==========

  // --- 化工反应器剥离所有气体输入 ---
  // R.strip('gtceu:chemical_reactor', '#forge:gases', true)

  // --- 批量删除废弃配方 ---
  // R.deleteMatching('gtceu:assembler', '.*deprecated.*')

  // --- 正则匹配替换（所有透镜 → 编程电路） ---
  // R.replace('gtceu:nano_forge', 'gtceu:.*glass_lens', 'gtceu:programmed_circuit')

  // --- 查询示例 ---
  // var ids = R.findRecipeIds('gtceu:nano_forge', '.*nanoswarm')
  // console.info('[山海] 找到 ' + ids.length + ' 个纳米虫群配方')

  console.info('[山海·规则管理] 配方规则已加载完成')
})
