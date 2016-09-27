var root = null;
var point = null;

if (window.innerWidth && window.innerWidth <= 600) { 
    $(document).ready(function(){
        $('#header ul').addClass('hide'); 
        $('#header').append('<div class="leftButton" onclick="toggleMenu()">Menu</div>');
    }); 
    function toggleMenu() {
        $('#header ul').toggleClass('hide'); 
        $('#header .leftButton').toggleClass('pressed');
    }
}

function androidLoadMap(link) {

    $.ajax({
        url: link,
        contentType: 'application/json',
        dataType: "json",
        success : function (data) {
            var name = data.name;
            root = data;
            constructParent(root);
            $("#mainMap").append("<li><a href='#' id='nodename'>"+name+"</a></li>");
            //$("#mainMap").append("<li><a href='#'>上一层</a></li>");
        }
    });
} 
function constructParent(data) {

}

function goUpLeve() {
    
    $('#nodename').text = "";
}
