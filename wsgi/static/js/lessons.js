
var exports = {};

function initLesson(link) {
    global_link = link+'currentLesson';
    currentLesson = localStorage.getItem(global_link) || 1;
    if (currentLesson !== 1) {
        $('.lesson1').hide();
        evaluate.init();
        startLesson(currentLesson);
    }
}

function updateLesson(input, output) {
    var lesson = 'lesson' + currentLesson;

    if (lessonCompleted[lesson] || (typeof(output) === "undefined" && typeof(input) == "number")) {
        var result = null;
        
        if (typeof(output) !== "undefined")
            result = lessonCompleted[lesson].call(this, input, output);

        if (result || (typeof(output) === "undefined" && typeof(input) == "number")) {
            $('.lesson' + currentLesson).hide();
            currentLesson++;

            localStorage.setItem(global_link, currentLesson);
            startLesson(currentLesson);
            
        }
    }

    if (currentLesson === global_lesson_count) {
        updateMastery();
    }
};

// Give the globalFuncs access to the current answer
exports.getAnswer = function () {
    var solution = lessonCompleted['lesson' + currentLesson + 'Solution'];

    if (!solution) {
        return null;
    }

    return solution.replace(/{{ (\S+) }}/, function (text, property) {
        return data[property] ? data[property] : text;
    });
};

exports.previousLesson = function () {
    if (currentLesson === 1) {
        return;
    }

    currentLesson--;
    localStorage.setItem(global_link, currentLesson);

    $('.lesson').hide();
    $('.lesson' + currentLesson).show();
};

function startLesson(num) {
    $('.lesson' + num).show()
        .find('p, h1, pre').each(function () {
            var $this = $(this),
            html = $this.html();

        // @todo: Don't use .html()!
        html = html.replace(/{{ (\S+) }}/, function (text, property) {
            return data[property] ? data[property] : text;
        });

        $this.html(html);
    });
}

function contains(string, substr) {
    if ($.isArray(substr)) {
        return substr.reduce(function (prev, actualSubstr) {
            return prev && contains(string, actualSubstr);
        }, true);
    }

    return string.indexOf(substr) !== -1;
}

function getRegex(input) {
    if (contains(input, 'test') || contains(input, 'exec')) {
        input = input.split('.')[0];
    } else {
        input = input.slice(input.indexOf('(') + 1, input.lastIndexOf(')'));
    }


    if (!/^\/.+\/[igny]*$/.test(input)) {
        return false;
    }

    var lastIndex = input.lastIndexOf('/');

    var body = input.slice(1, lastIndex);
    var flags = input.slice(lastIndex + 1);

    return new RegExp(body, flags);
}
