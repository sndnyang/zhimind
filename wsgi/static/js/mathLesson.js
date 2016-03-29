
var error_times = 0,
    currentLesson = 1,
    global_link = 'currentLesson';

function initLesson(link) {
    global_link = link+'currentLesson';
    currentLesson = localStorage.getItem(global_link) || 1;
    if (currentLesson !== 1) {
        startLesson(currentLesson);
    }
}

function checkQuiz(id) {
    var value, 
        your_answer,
        ele = $("input[name='quiz"+id+"']"),
        type = ele.attr("type"),
        correct = global_answers[id-1];
    
    if (type === "radio") {
        value = $("input[name='quiz"+id+"']:checked").val(); 

    } else if (type === "checkbox") {

        value = '';

        $("input[name='quiz"+id+"']").each(function() {
            if ($(this).prop('checked') ==true) {
                value += $(this).val()+"@";
            }
        });

        value = value.substring(0, value.length-1);

    } else if (type === "text") {
        value = ele.val();
    }

    your_answer = $.md5(value);

    if (your_answer === correct) {
        $('.lesson' + (id+1)).show();
        updateLesson();
            
        error_times = 0;
    } else {
        $('.hint').css('display', 'block');
        $('.flashes').html('');
        if (id in global_comment) {
            var comments = global_comment[id];
                idx = Math.min(error_times, comments.length-1),
                comment = comments[idx];
            $('.flashes').append("<li>对不起， 答案错误</li>")
            $('.flashes').append("<li>提示:</li>")
            $('.flashes').append("<li>"+comment+"</li>")
        }
        error_times++;
        setTimeout("$('.hint').fadeOut('slow')", 5000)
    }
}

function updateLesson() {

  //$('.lesson' + currentLesson).hide();
    currentLesson++;

    localStorage.setItem(global_link, currentLesson);
    $('.lesson' + currentLesson).show();
};

function startLesson(num) {
    for (var i = 2; i <= num; i++) {
        $('.lesson' + i).css('display', 'block');
        $('.lesson' + i).show();
    }
}
