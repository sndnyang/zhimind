
function initLesson(link) {
    global_link = link+'currentLesson';
    currentLesson = localStorage.getItem(global_link) || 1;
    if (currentLesson !== 1) {
        startLesson(currentLesson);
    }
}

function startLesson(num) {
    for (var i = 2; i <= num; i++) {
        $('.lesson' + i).css('display', 'block');
        $('.lesson' + i).show();
    }
}

function updateLesson(no) {

    if (no === currentLesson+1) {
        currentLesson = no;
        localStorage.setItem(global_link, currentLesson);

        if (currentLesson === global_lesson_count) {
            updateMastery();  
        }
    }

    $('.lesson' + no).show();
}
