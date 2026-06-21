//priority: 10000


(function() {
ServerEvents.recipes(event => {
    event.remove({output:'@mekanism'})
})
})();