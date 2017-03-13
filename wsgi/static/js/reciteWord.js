var db;
var unit = [];
var openRequest;
var serverData = {};
var reciteTimes = {};
var updateWords = {};
var currentWord, index;
var completeNumber = 0;
var mode = localStorage.getItem("mode") || "en-zh";
var limit = localStorage.getItem("limit") || 20;
var currentBook = localStorage.getItem("book");
var myBooks = JSON.parse(localStorage.getItem("myBooks")) || {};

String.prototype.trim=function() {
    return this.replace(/(^\s*)|(\s*$)/g,'');
};

$(document).ready(function(){
    if (!currentBook || currentBook === "") {
        //$("#start").html("开始学习 (当前未选中单词书，请先到词库选择)");
        $("#currentBook").html('未选中单词书，请先到词库选择');
    }

    $(document).keydown(function (event) {
        if ($("textarea").is(":focus")) {
            return true;
        }

        if (event.keyCode == 13 && $("input").is(":focus")) {
            word_quiz();
            return true;
        }

            var section = $("div.active").attr("id"),
            forget = $("#next_right").css("display");

        if (event.keyCode == 37) {
            //判断当event.keyCode 为37时（即左方面键）
            if (section == "recall") { fuzzy(); } //recall页面对应 模糊
            else if (section == "remember") { // remember页面对应 记对了
                if (forget !== "none") right();
            }
            return false;
        } else if (event.keyCode == 38) {
            //判断当event.keyCode 为38时（即上方面键）
            if (section == "recall") { ok(); } //recall页面对应 知道
            else if (section == "remember") { // remember页面对应 掌握
                if (forget !== "none") master();
            }
            return false;
        } else if (event.keyCode == 39) {
            //判断当event.keyCode 为39时（即右方面键）
            if (section == "recall") { sorry(); } //recall页面对应 不知道
            else if (section == "remember") { // remember页面对应 记错了
                if (forget !== "none") wrong();
                else reciteMainView();
            }
            return false;
        } else if (event.keyCode == 40) {
            //判断当event.keyCode 为40时（即下方面键）
            /*if (section == "recall") { } //recall页面不存在
            else if (section == "remember") { // remember页面对应 不重要单词
                trivial();
            }*/
            audio($('audio')[0], $('a.us').attr("data-rel"));
            return false;
        }
    });

    function ok() {
        $("#next_right").css("display", "inline-block");
        $("#next_wrong").css("display", "none");
        $("#recall").attr("class", "tab-pane fade");
        $("#remember").attr("class", "tab-pane fade in active");
    }

    $("#ok").click(ok);

    function fuzzy() {
        if ($(".word").html() != currentWord.word) {
            word_quiz();
        }
        else {
            $("#next_right").css("display", "inline-block");
            $("#next_wrong").css("display", "none");
            $("#recall").attr("class", "tab-pane fade");
            $("#remember").attr("class", "tab-pane fade in active");
        }
    }

    $("#fuzzy").click(fuzzy);

    function sorry() {
        if ($(".word").html().trim() != currentWord.word.trim()) {
            $(".word").html(currentWord.word.trim());
            $("#zh").html(currentWord.meanZh.replace(/[\r\n]/g, '<br>'));
            $("#en").html(currentWord.meanEn.replace(/[\r\n]/g, '<br>'));
            var media = document.getElementsByTagName('audio')[0];
            audio(media, 'http://dict.youdao.com/dictvoice?type=2&audio=' + currentWord.word);
        }
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = Math.max(Math.floor(currentWord.level/2), 1);
        if (!(currentWord.word in updateWords)) {
            updateWords[currentWord.word] = {};
        }
        updateWords[currentWord.word]['level'] = currentWord.level;
        itemStore.put(currentWord);
        $("#next_right").css("display", "none");
        $("#next_wrong").css("display", "inline-block");
        $("#recall").attr("class", "tab-pane fade");
        $("#remember").attr("class", "tab-pane fade in active");
    }

    $("#sorry").click(sorry);

    function animate() {
        progress.animate({
            width: Math.floor(100.0*completeNumber/limit) + "%"
        }, 100, function() {
            percent.text(completeNumber);
            total.text(limit);
        });
    }

    function master() {
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = 10;
        if (!(currentWord.word in updateWords)) {
            updateWords[currentWord.word] = {};
        }
        updateWords[currentWord.word]['level'] = currentWord.level;
        itemStore.put(currentWord);
        unit.splice(index, 1);

        completeNumber++;
        myBooks[currentBook].finish++;
        $("#currentBookFinish").html(" 掌握个数:" + myBooks[currentBook].finish);

        localStorage.setItem('myBooks', JSON.stringify(myBooks));

        if (completeNumber >= limit) { sessionEnd(); }
        else { reciteMainView(); }
        animate();
    }

    function right() {
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = Math.min(currentWord.level+1, 10);

        if (!(currentWord.word in updateWords)) {
            updateWords[currentWord.word] = {};
        }
        updateWords[currentWord.word]['level'] = currentWord.level;

        itemStore.put(currentWord);
        reciteTimes[currentWord.word] = reciteTimes[currentWord.word] + 1 || 1;

        if (currentWord.level > 9 || reciteTimes[currentWord.word] >= 3) {
            unit.splice(index, 1);
            completeNumber++;
            if (currentWord.level > 9) {
                myBooks[currentBook].finish += 1;
                $("#currentBookFinish").html(" 掌握个数:" + myBooks[currentBook].finish);
                localStorage.setItem('myBooks', JSON.stringify(myBooks));
            }
        }

        if (completeNumber >= limit) { sessionEnd(); }
        else { reciteMainView(); }
        animate();
    }
    $("#master").click(master);

    $("#right").click(right);

    function wrong() {
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level =  Math.max(Math.floor(currentWord.level/2), 1);
        if (!(currentWord.word in updateWords)) {
            updateWords[currentWord.word] = {};
        }
        updateWords[currentWord.word]['level'] = currentWord.level;
        itemStore.put(currentWord);
        reciteMainView();
    }
    $("#wrong").click(wrong);

    function trivial() {
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = 11;
        if (!(currentWord.word in updateWords)) {
            updateWords[currentWord.word] = {};
        }
        updateWords[currentWord.word]['level'] = currentWord.level;
        itemStore.put(currentWord);
        unit.splice(index, 1);
        completeNumber++;
        myBooks[currentBook].finish += 1;
        localStorage.setItem('myBooks', JSON.stringify(myBooks));
        $("#currentBookFinish").html(" 掌握个数:" + myBooks[currentBook].finish);

        if (completeNumber >= limit) { sessionEnd(); }
        else { reciteMainView(); }
        animate();
    }
    $("#trivial").click(trivial);

    $("#next").click(reciteMainView);

    $(".audio").click(function () {
        var media = $(this).get(0).getElementsByTagName('audio')[0];
        audio(media, $(this).data("rel"));
    });

    progress = $('.progress-bar');
    percent = $('.percentage');
    total = $('.total');
    //stripes = $('.progress-stripes');
    //stripes.text('//////////');

    setSkin(demoColorArray[colorIndex]);
    animate();

    function updateSetting() {
        limit = $("#unitNum").val() || 20;
        mode = $("#unitMode").val() || "en-zh";
        localStorage.setItem("limit", limit);
        localStorage.setItem("mode", mode);
        unit = [];
        $("#recite").attr("class", "tab-pane fade in active");
        $("#setting").attr("class", "tab-pane fade");
        $("#myTab").children('li.active').removeClass('active');
        $("#myTab").children('li').children('a[href="#recite"]').parent().addClass('active');
        animate();
    }
    $(".unitNum").click(updateSetting);

    for (var book in myBooks) {
        var num = myBooks[book].num, view = myBooks[book].view,
            finish = myBooks[book].finish,
            newBook = "<div><a href='javascript:void(0)' class='storedBook'" +
                " onclick='chooseBooks(this)'>" + book + "</a> 总单词数:" + num +
                ", 已浏览:" + view + ", 已完成:" + finish + "</div>";

        $("#myBooks2").append(newBook);
    }

    function word_quiz() {
        var word1 = currentWord.temp, word2 = $("#word_quiz").val();
        if (word1.toLowerCase().trim() === word2.toLowerCase().trim()) {
            $("#fuzzy").text("模糊(left)");
            $("#sorry").show();
            $(".learning-speaker").show();
            $(".word_quiz").hide();
            right();
        } else {
            $(".word_quiz").append($("<p>wrong</p>"));
        }
    }
});

// In the following line, you should include the prefixes of implementations you want to test.
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

if (currentBook) {
    initIndexDB("init", null, null);
}

function putWords() {

    $.ajax({
        method: "post",
        url : "/putWords",
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify({'data': updateWords, 'book': currentBook}),
        success : function (data){
            updateWords = {};
        }
    });
}

function getWords() {
    var i = 0, num = myBooks[currentBook].num,
        finish = myBooks[currentBook].finish,
        view = myBooks[currentBook].view;
    $.ajax({
        method: "get",
        url : "/getWords/"+currentBook,
        contentType: 'application/json',
        dataType: "json",
        success : function (data){
            serverData = data;
            var transaction = db.transaction(["word"], "readwrite");
            var itemStore = transaction.objectStore("word"), keys = [];
            for (var e in serverData) {
                keys.push(e);
            }

            getNext();

            function getNext() {
                if (i < keys.length) {
                    var word = keys[i];
                    itemStore.get(word).onsuccess = function (e) {
                        var item = e.target.result;
                        for (var ele in serverData[word]) {
                            if ('level' in serverData[word] && item['level']
                             < 10 && serverData[word]['level'] > 9) {
                                myBooks[currentBook].finish++;
                            }
                            if (serverData[word][ele] && serverData[word][ele] !== "") {
                                item[ele] = serverData[word][ele];
                            }
                        }
                        ++i;
                        itemStore.put(item).onsuccess = getNext;
                    }
                } else {
                    localStorage.setItem('myBooks', JSON.stringify(myBooks));
                    updateProgress(num, myBooks[currentBook].view, myBooks[currentBook].finish);
                }
            }
        },
        error: function(e) {
            updateProgress(num, view, finish);
        }
    });
}

function initIndexDB(type, content, name) {
    var dbExists = true;

    openRequest = window.indexedDB.open(currentBook, 1);
    openRequest.onerror = function(event) {
        console.error(event);
    };

    openRequest.onsuccess = function (event) {
        var i = 0;
        db = event.target.result;
        db.onerror = function(event) {
            // Generic error handler for all errors targeted at this database's requests
            console.error(event.target);
            window.alert("Database error: " + event.target.wePutrrorMessage || event.target.error.name || event.target.error || event.target.errorCode);
        };

        if (type == "newbook") {
            if (!dbExists) {
                console.log("create");
                createNewBook(content, name);
            } else {
                console.log('数据库已存在， 需要更新');
                updateBook(content, name);
            }
        } else {
            console.log('数据库已存在，连接成功');
            getWords();
        }

        if (type == "newbook") {
            $("#myTab").children('li.active').removeClass('active');
            $("#myTab").children('li').children('a[href="#myBooks"]').parent().addClass('active');

            $("#books").attr("class", "tab-pane fade");
            $("#myBooks").attr("class", "tab-pane fade in active");
        }
    };
    openRequest.onupgradeneeded = function(event) {
        db = event.target.result;

        if(event.target.result.oldversion === 0){
            console.log("book exists");
        }
        else {
            dbExists = false;
            console.log("book not exists");
        }
        objectStore = db.createObjectStore("word", {keyPath: "word"});
        objectStore.createIndex('word', 'word', { unique: false });
        objectStore.createIndex('level', 'level', { unique: false });
    };
}

function chooseBooks(obj) {

    if (currentBook !== $(obj).html()) {
        console.log('更换单词书');
        putWords();
        currentBook = $(obj).html().trim();

        localStorage.setItem("book", currentBook);

        initIndexDB("init", null, null);
    }

    $("#myTab").children('li.active').removeClass('active');
    $("#myTab").children('li').children('a[href="#recite"]').parent().addClass('active');

    $("#recite").attr("class", "tab-pane fade in active");
    $("#myBooks").attr("class", "tab-pane fade");
}

function audio(media, url) {
    try{
        media.ended = true;
        media.setAttribute("src", url);
        media.load();
        media.play();
        return false;
    }
    catch (err) {
        alert(err.description);
        return false;
    }
}

function closeDB(db){
    db.close();
}

function deleteDB(name){
    indexedDB.deleteDatabase(name);
}

function toItemJson(item) {
    var jsonObj = {},
        cols = ['id', 'word', 'level', 'lenovo', 'etyma', 'meanZh', 'meanEn',
         'example', 'phonetic', 'selfLenovo'];
    for (var i = 1; i < cols.length; i++) {
        if (i == 2) jsonObj[cols[i]] = 0;
        else jsonObj[cols[i]] = item[i] || "";
    }
    return jsonObj;
}

function updateItemJson(jsonObj, item) {
    var flag = false, cols = ['id', 'word', 'level', 'lenovo', 'etyma',
                              'meanZh', 'meanEn', 'example', 'phonetic'];
    for (var i = 3; i < cols.length; i++) {
        if (item[i] && item[i] !== "" && jsonObj[cols[i]] !== item[i]) {
            jsonObj[cols[i]] = item[i];
            flag = true;
        }
    }
    if (flag) return jsonObj;
    else return null;
}

function updateBook(content, name) {

    var i = 0, count = 0, items = content.values;
    var transaction = db.transaction(["word"], "readwrite");
    var itemStore = transaction.objectStore("word");

    putNext();

    function putNext() {
        if (i < items.length) {
            itemStore.get(items[i][1]).onsuccess = function (e) {
                var item;
                if (item) item = updateItemJson(e.target.result, items[i]);
                else item = toItemJson(items[i]);

                ++i;
                if (item) {
                    count++;
                    itemStore.put(item).onsuccess = putNext;
                } else {
                    putNext();
                }
            }
        } else {   // complete
            console.log('populate complete  ' + i + ' 更新 单词书 ' + currentBook +
                        " 变更单词 " + count + "个");
            if (i !== myBooks[currentBook].num) {
                myBooks[currentBook].num = i;
                localStorage.setItem('myBooks', JSON.stringify(myBooks));
                updateProgress(i, myBooks[currentBook].view, myBooks[currentBook].finish);
            }
            $("#myTab").children('li.active').removeClass('active');
            $("#myTab").children('li').children('a[href="#myBooks"]').parent().addClass('active');

            $("#books").attr("class", "tab-pane fade");
            $("#myBooks").attr("class", "tab-pane fade in active");
        }
    }
}

function createNewBook(content, name) {

    var i = 0, items = content.values;
    var transaction = db.transaction(["word"], "readwrite");
    var itemStore = transaction.objectStore("word");

    putNext();

    function putNext() {

        if (i < items.length) {
            var item = toItemJson(items[i]);
            itemStore.put(item).onsuccess = putNext;
            ++i;
        } else {   // complete
            console.log('populate complete  ' + i + ' 添加 单词书 ' + currentBook);

            myBooks[currentBook] = {'num': i, 'finish': 0, 'view': 0};
            localStorage.setItem('myBooks', JSON.stringify(myBooks));

            updateProgress(i, 0, 0);

            var newBook = "<div><a href='javascript:void(0)' class='storedBook'" +
                " onclick='chooseBooks(this)'>" + currentBook + "</a> 总单词数:"
                 + i + ", 已浏览:" + 0 + ", 已完成:" + 0 + "</div>";

            $("#myBooks2").append(newBook);

            $("#myTab").children('li.active').removeClass('active');
            $("#myTab").children('li').children('a[href="#myBooks"]').parent().addClass('active');

            $("#books").attr("class", "tab-pane fade");
            $("#myBooks").attr("class", "tab-pane fade in active");
        }
    }
}

function updateProgress(total, view, finish) {
    $("#currentBook").html("单词书:" + currentBook);
    $("#currentBookNum").html(" 总单词数:" + total);
    $("#currentBookView").html(" 浏览个数:" + view);
    $("#currentBookFinish").html(" 掌握个数:" + finish);
}

function downloadbook(obj, name) {

    var xhr = new XMLHttpRequest();
    xhr.open('GET', name+"?v="+Math.round(Math.random()*10000), true);
    xhr.responseType = 'arraybuffer';
    currentBook = $(obj).html().trim();
    localStorage.setItem("book", $(obj).html().trim());

    xhr.onload = function(e) {
        var uInt8Array = new Uint8Array(this.response);
        var db = new SQL.Database(uInt8Array);
        var contents = db.exec("SELECT * FROM word");
        initIndexDB('newbook', contents[0], name);
      // contents is now [{columns:['col1','col2',...], values:[[first row], [second row], ...]}]
    };
    xhr.send();
}

function sessionEnd() {
    //alert("恭喜您完成本次 " + limit + "个单词的背诵");
    putWords();
    $("#recite").attr("class", "tab-pane fade in active");
    $("#recall").attr("class", "tab-pane fade");
    $("#remember").attr("class", "tab-pane fade");
    completeNumber = 0;
}

function start() {
    var i = 0, store, transaction, cursorRequest
    transaction = db.transaction(["word"], "readwrite");
    store = transaction.objectStore("word");
    cursorRequest = store.index('level').openCursor(null, 'next');

    unit = [];

    cursorRequest.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
            if (cursor.value.level < 10) {
                if (unit.length < limit) {
                    unit.push(cursor.value);
                } else {
                    var prob = 1.0 * limit / myBooks[currentBook].num;
                    if (Math.random() < prob) {
                        unit[i%limit] = cursor.value;
                    }
                }
                i++;
            }

            cursor.continue();
        }
        else {
            reciteMainView();
        }
    };
}

function renderLenovo(text) {
    var result = "<h3>" +
    text.replace(/<r>/g, '<p style="color:red;display:inline-block">')
        .replace(/<b>/g, '<p style="color:blue;display:inline-block">')
        .replace(/<g>/g, '<p style="color:green;display:inline-block">')
    //.replace(/<\/g>/g,'</p>').replace(/<\/r>/g,'</p>').replace(/<\/b>/g,'</p>')
        .replace(/<\/[grb]>/g,'</p>')
        .replace(/[\(（]/g, '<p style="color:red;display:inline-block">')
        .replace(/[\)）]/g, '</p>')
        .replace(/[\r\n]/g, '<br>')
        + "</h3>";
    //console.log(result);
    return result;
}

function isStem(w1, w2) {
    var i = 0;
    for (i = 0; i < w1.length; i++) {
        if (i >= w2.length || w1[i] != w2[i]) {
            break;
        }
    }
    return 3 * i > w1.length * 2.0;
}

function genBlank(sentence, word) {
    var c = true, words = sentence.split(/[ ,.!?;]/),
        input = '<input type="text" class="form-control" id="word_quiz"/>';

    for (var i in words) {
        if (isStem(word.toLowerCase(), words[i].toLowerCase())) {
            if (c) {
                currentWord.temp = words[i];
                sentence = sentence.replace(words[i], input);
                c = false;
            } else {
                sentence = sentence.replace(words[i], "___");
            }
        }
    }
    var span = $("<p>" + sentence + "</p>");
    return span;
}

function learnPage() {
    $(".phonetic").html(currentWord.phonetic);
    $(".uk").attr('data-rel', 'http://dict.youdao.com/dictvoice?type=1&audio=' + currentWord.word);
    $(".us").attr('data-rel', 'http://dict.youdao.com/dictvoice?type=2&audio=' + currentWord.word);
    $("#etyma").html(currentWord.etyma.replace(/[\r\n]/g, '<br>'));
    $("#example").html(currentWord.example.replace(/[\r\n]/g, '<br>'));
    $("#youdao").attr("href", "http://dict.youdao.com/search?q=" + currentWord.word);
    $("#youdao").attr("target", "_blank");

    if (currentWord.selfLenovo !== "") {
        $("#lenovo").html("自创记忆法:"+renderLenovo(currentWord.selfLenovo)+
            "参考记忆法:"+renderLenovo(currentWord.lenovo));
    }
    else {
        $("#lenovo").html("参考记忆法:"+renderLenovo(currentWord.lenovo));
    }
    $('#node').hide();
    $("#remember").attr("class", "tab-pane fade");
    $("#recite").attr("class", "tab-pane fade");
    $("#recall").attr("class", "tab-pane fade in active");
}

function reciteMainView() {
    var new_index = Math.round(Math.random() * (unit.length - 1));

    if (unit.length > 1 && index === new_index)
        new_index = unit.length - index - 1;
    index = new_index;
    currentWord = unit[index];

    if (!currentWord.level) {
        myBooks[currentBook].view++;
        $("#currentBookView").html(" 浏览个数:" + myBooks[currentBook].view);
    }

    if (mode === "zh-en" || (mode === "mix" && currentWord.level > 2 &&
        Math.random() > 0.5 && currentWord.example.length > 3)) {
        var word = currentWord.word;
        $(".uk").attr('data-rel', '');
        $(".us").attr('data-rel', '');

        var examples = currentWord.example.trim().split(/[\r\n]/g),
            s = examples.length,
            example = examples[Math.floor(Math.random() * s)],
            sentence = example.split(":")[1],
            meaning = example.split(":")[0],
            blank_div = genBlank(sentence, currentWord.word);
        $(".word").html(meaning);
        $("#fuzzy").text("验证");
        $("#ok").hide();
        $(".learning-speaker").hide();
        $(".word_quiz").html(blank_div);
        $(".word_quiz").show();
    }
    else {
        $(".word").html(currentWord.word);
        var media = document.getElementsByTagName('audio')[0];
        audio(media, 'http://dict.youdao.com/dictvoice?type=2&audio=' + currentWord.word);
        $("#zh").html(currentWord.meanZh.replace(/[\r\n]/g, '<br>'));
        $("#en").html(currentWord.meanEn.replace(/[\r\n]/g, '<br>'));
        $("#fuzzy").text("模糊(left)");
        $("#ok").show();
        $(".learning-speaker").show();
        $(".word_quiz").html();
        $(".word_quiz").hide();
    }
    learnPage();
}

function addLenovo(obj) {
    var textarea = $(obj).parent().children("textarea"),
        text = textarea.val();
    if (text !== "") {
        $("#lenovo").html("自创记忆法:"+renderLenovo(text)+"参考记忆法:"+
            renderLenovo(currentWord.lenovo));
        currentWord.selfLenovo = text;
        if (!(currentWord.word in updateWords)) {
            updateWords[currentWord.word] = {};
        }
        updateWords[currentWord.word]['selfLenovo'] = text;
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        itemStore.put(currentWord);
        textarea.val("");
    }
}

function createNote() {
    $('#note').show();
}
