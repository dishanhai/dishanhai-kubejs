(function() {
var $KeyMapping = Java.loadClass("net.minecraft.client.KeyMapping");
var $GLFW = Java.loadClass("org.lwjgl.glfw.GLFW");
var $KeyMappingRegistry = Java.loadClass("dev.architectury.registry.client.keymappings.KeyMappingRegistry");

global.copyIdKey = new $KeyMapping(
    "key.kubejs.copy_id",
    $GLFW.GLFW_KEY_F6,
    "key.keybinding.kubejs"
);

ClientEvents.init(() => {
    $KeyMappingRegistry.register(global.copyIdKey);
});
})();
