'use strict';

angular.module('mindMapApp', ['controller']);

$(window).resize(resizeCanvas);

function resizeCanvas() {
    $(".mindMap").css("width", $(window).get(0).innerWidth);
    $(".mindMap").css("height", $(window).get(0).innerHeight-100);
};
resizeCanvas();
