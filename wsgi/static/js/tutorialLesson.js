
function initLesson(link) {
    global_link = link + 'currentLesson';
    currentLesson = localStorage.getItem(global_link) || 1;
    startLesson(currentLesson);
}

function startLesson(num) {
    var i;
    for (i = 2; i <= num; i++) {
        $('.lesson' + i).show();
    }
    for (i = num+1; i <= global_lesson_count; i++) {
        $('.lesson' + i).hide();
    }
}

function previousLesson(no) {
    if (no === 0) {
        return;
    }

    currentLesson = no;
    localStorage.setItem(global_link, currentLesson);

    for (var i = no+1; i <= global_lesson_count; i++)
        $('.lesson' + i).hide();
}

function updateLesson(no) {

    if (no === parseInt(currentLesson)+1) {
        currentLesson = no;
        localStorage.setItem(global_link, currentLesson);

        if (currentLesson === global_lesson_count) {
            updateMastery();  
        }
    }

    $('.lesson' + no).show();
    $("body").animate({
        scrollTop: $('.lesson' + no).offset().top - $(".navbar").height() - 5
    }, 500);
}
