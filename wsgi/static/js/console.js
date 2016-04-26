/*global $, console, pushToPreviousCmds, keymap, evaluate, objToString, updateLesson*/

$(document).ready(function () {
    'use strict';
    var regexConsole = $('.console'),
        input = $('.regex-input'),
        eventObject = {},
        reverseCmdIndex = 0,
        previousCmds = localStorage.getItem('previousCommands');
    
    previousCmds = previousCmds ? JSON.parse(previousCmds) : [];

    regexConsole.click(function (e) {
        if (['LI', 'CODE'].indexOf(e.target.tagName) === -1) {
            input.focus();
        }
    });

    input.keydown(function (e) {
        if (e.ctrlKey && e.keyCode === keymap.ENTER) {
            var $this = $(this),
                code = $this.val();

            if (code.length === 0) {
                return;
            }

            // @todo: Remove hack
            if (code.slice(0, 6) === 'reset(') {
                pushToPreviousCmds(code);
                window.reset();
                return;
            }

            // @todo: Remove hack
            if (code.slice(0, 6) === 'clear(') {
                pushToPreviousCmds(code);
                window.clear();
                $this.val('');
                return;
            }

            // @todo: Remove hack
            if (code.slice(0, 9) === 'previous(') {
                pushToPreviousCmds(code);
                window.previous();
                $this.val('');
                return;
            }

            // @todo: Remove hack
            if (code.slice(0, 11) === 'showAnswer(') {
                pushToPreviousCmds(code);
                window.showAnswer();
                $this.val('');
                return;
            }

            var result = evaluate(code),
            error = false;

            if (result instanceof Error) {
                result = '<strong class="error">' + result + '</strong>';
                error = true;
            } else {
                $(eventObject).trigger('data', [code, result]);
                // Called after code executed
                updateLesson(code, result);

                result = objToString(result);
            }

            pushToPreviousCmds(code);

            $('.prompt-completed').clone()
                .removeClass('prompt-completed')
                .insertBefore($this.parent())
                .find('code')
                .text(code);

            $('.prompt-result').clone()
                .removeClass('prompt-result')
                .insertBefore($this.parent())
                .find('code')
                [error ? 'html' : 'text'](result);

            input.val('');

            regexConsole.scrollTop(regexConsole.prop('scrollHeight'));

        } else if (e.keyCode === 13) {
            input.height(22 + input.height());
        } else if (e.keyCode === keymap.UP) {
            if (reverseCmdIndex >= previousCmds.length) {
                return;
            }

            if (reverseCmdIndex === 0 && input.val()) {
                pushToPreviousCmds(input.val());
                reverseCmdIndex++; // Yes, increase twice
            }

            reverseCmdIndex++;

            var newVal = previousCmds[previousCmds.length - reverseCmdIndex];

            input.val(newVal);

            // Silly JavaScript!
            setTimeout(function () {
                input[0].selectionStart = input[0].selectionEnd = newVal.length;
            });
        } else if (e.keyCode === keymap.DOWN) {
            if (reverseCmdIndex < 1) {
                return;
            }

            reverseCmdIndex--;

            input.val(previousCmds[previousCmds.length - reverseCmdIndex]);
        } else if (e.keyCode === keymap.L && e.ctrlKey) {
            window.clear();
        } else if (e.keyCode === 8 || e.keyCode === 46) {
            var lines = $(this).val().split('\n');
            input.height(22 * (lines.length || 1));
        }
    }).on('input', function () {
        reverseCmdIndex = 0;
    }).focus();

    function pushToPreviousCmds(cmd) {
        previousCmds.push(cmd);
        var prevCmdString = JSON.stringify(previousCmds);
        localStorage.setItem('previousCommands', prevCmdString);
    }
});
