/* SET RANDOM LOADER COLORS FOR DEMO PURPOSES */
var demoColorArray = ['red','blue','green','yellow','purple'];
var colorIndex = Math.floor(Math.random()*demoColorArray.length);

// Stripes interval
var stripesAnim;

/* STRIPES ANIMATION */
function stripesAnimate() {
    animating();
    stripesAnim = setInterval(animating, 2500);
}

function animating() {
    stripes.animate({
        marginLeft: "-=30px"
    }, 2500, "linear").append('/');
}

function setSkin(skin){
    $('.loader').attr('class', 'loader '+skin);
    //$('span').hasClass('loaded') ? $('span').attr('class', 'loaded '+skin) : $('span').attr('class', skin);
}

