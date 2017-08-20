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

function showBook(name, book) {
    var num = book.num, view = book.view, finish = book.finish,
        newBook = $("<div class='col-xs-6 col-md-3'></div>"),
        a = $("<a onclick='chooseBooks(this)'></a>"),
        img = $("<img alt='{0}'>".format(name));

    a.attr("id", name);
    a.attr("href", 'javascript:void(0)'); 
    a.attr("class", 'thumbnail storedBook'); 
    img.attr("style" , "height: 180px; width: 100%");

    a.append(img);
    a.append($("<p>{0}</p>".format(name)))
    a.append($("<p>{0}</p>".format("总单词数:" + num)))
    a.append($("<p>{0}</p>".format("已浏览数:" + view)))
    a.append($("<p>{0}</p>".format("已掌握数:" + finish)))

    newBook.append(a)

    return newBook;
}

function updateWord(property, v) {
    var transaction = db.transaction(["word"], "readwrite");
    var itemStore = transaction.objectStore("word");
    currentWord[property] = v;
    if (!(currentWord.word in updateWords)) {
        updateWords[currentWord.word] = {};
    }
    updateWords[currentWord.word][property] = v;
    if (property === "level") updateWords[currentWord.word]["time"] = new Date().getTime();
    itemStore.put(currentWord);
}

$(document).ready(function(){
    if (!currentBook || currentBook === "") {
        //$("#start").html("开始学习 (当前未选中单词书，请先到词库选择)");
        $("#currentBook").html('未选中单词书，请先到词库选择');
    }

    $(document).keydown(function (event) {
        if ($("textarea").is(":focus")) {
            // 在文本框中输入联想记忆法时
            // 键盘按键是默认结果，所以 return true
            return true;
        }

        if ($("input").is(":focus")) {
            if (event.keyCode == 13) // 在输入框中输入单词后回车，进行测试
                word_quiz();
            if (event.keyCode != 40 && event.keyCode != 18) // 下方向键功能
                return true;
        }
        var section = $("div.active").attr("id"),
            forget = $("#next_right").css("display");

        if (event.keyCode == 37 || event.keyCode == 74) {
            // 判断当event.keyCode 为37时（即左方向键） or j
            if (section == "recall") { fuzzy(); } // recall页面对应 模糊
            else if (section == "remember") { // remember页面对应 记对了
                if (forget !== "none") right();
            }
            return false;
        } else if (event.keyCode == 39 || event.keyCode == 76) {
            // 判断当event.keyCode 为39时（即右方向键） or l
            if (section == "recall") { checkMemory("#next_right"); } // recall页面对应 知道
            else if (section == "remember") { // remember页面对应 掌握
                if (forget !== "none") master();
            }
            return false;
        } else if (event.keyCode == 40 || event.keyCode == 75
                || (event.keyCode == 18 && mode == "zh-en")) {
            // 判断当event.keyCode 为40时（即下方向键） or k or alt
            if (section == "recall") { sorry(); } // recall页面对应 不知道
            else if (section == "remember") { // remember页面对应 记错了
                if (forget !== "none") wrong();
                else reciteMainView();
            }
            return false;
        } else if (event.keyCode == 38 || event.keyCode == 72) {
            // 上方向键 or h
            audio($('audio')[0], $('a.us').attr("data-rel"));
            return false;
        }
    });

    function fuzzy() {
        if ($(".word").html().trim() != currentWord.word.trim()) {
            // 单词测试（中 -> 英） <--> .word 显示的不是当前单词
            word_quiz();
        }
        else { checkMemory("#next_right"); }
    }

    function sorry() {
        if ($(".word").html().trim() != 
                currentWord.word.trim()) {
            $(".word").html(currentWord.word.trim()); // 显示正确答案
            $("#zh").html(currentWord.meanZh.replace(/[\r\n]/g, '<br>'));
            $("#en").html(currentWord.meanEn.replace(/[\r\n]/g, '<br>'));
            var media = document.getElementsByTagName('audio')[0];
            audio(media, 'http://dict.youdao.com/dictvoice?type=2&audio=' + currentWord.word);
        }
        updateWord('level', Math.max(Math.floor(currentWord.level/2), 1));
        reciteTimes[currentWord.word] = reciteTimes[currentWord.word] + 1 || 1;
        checkMemory("#next_wrong")
    }

    function animate() {
        progress.animate({
            width: Math.floor(100.0*completeNumber/limit) + "%"
        }, 100, function() {
            percent.text(completeNumber);
            total.text(limit);
        });
    }

    function updateMaster() {
        if (currentWord.level > 9 || reciteTimes[currentWord.word] >= 3) {
            unit.splice(index, 1);
            completeNumber++;
            if (reciteTimes[currentWord.word] >= 3)
                updateWord('level', Math.min(currentWord.level+1, 10));
        }
        if (currentWord.level > 9) {
            myBooks[currentBook].finish++;
            $("#currentBookFinish").html(" 掌握个数:" + myBooks[currentBook].finish);
            localStorage.setItem('myBooks', JSON.stringify(myBooks));
        }

        if (completeNumber >= limit) { sessionEnd(); }
        else { reciteMainView(); }
        animate();
    }

    function master() {
        updateWord('level', 10);
        updateMaster();
    }

    function right() {
        reciteTimes[currentWord.word] = reciteTimes[currentWord.word] + 1 || 1;
        updateMaster();
    }

    function wrong() {
        updateWord('level', Math.max(Math.floor(currentWord.level/2), 1));
        reciteTimes[currentWord.word] = reciteTimes[currentWord.word] + 1 || 1;
        reciteMainView();
    }
    
    function trivial() {
        updateWord('level', 11);
        updateMaster()
    }

    function updateSetting() {
        limit = $("#unitNum").val() || 20;
        mode = $("#unitMode").val() || "en-zh";
        localStorage.setItem("limit", limit);
        localStorage.setItem("mode", mode);
        unit = [];
        switchTab("#recite");
        animate();
    }

    $(".unitNum").click(updateSetting);
    $("#ok").click(function() { checkMemory("#next_right"); });
    $("#fuzzy").click(fuzzy);
    $("#sorry").click(sorry);
    $("#master").click(master);
    $("#right").click(right);
    $("#wrong").click(wrong);
    $("#trivial").click(trivial);
    $("#next").click(reciteMainView);

    $(".audio").click(function () {
        var media = $(this).get(0).getElementsByTagName('audio')[0];
        audio(media, $(this).data("rel"));
    });

    progress = $('.progress-bar');
    percent = $('.percentage');
    total = $('.total');
    setSkin(demoColorArray[colorIndex]);
    animate();

    for (var book in myBooks) {
        $("#myBooks2").append(showBook(book, myBooks[book]));
    }

    function word_quiz() {
        var word1 = currentWord.temp, word2 = $("#word_quiz").val();
        if (word1.toLowerCase().trim() === word2.toLowerCase().trim()) {
            $("#fuzzy").text("模糊(左或j)");
            $("#sorry").show();
            $(".learning-speaker").show();
            $(".word_quiz").hide();
            show_after_quiz();
        } else {
            $(".word_quiz").append($("<p>wrong</p>"));
        }
    }

    function show_after_quiz() {
        $(".word").html(currentWord.word);
        var media = document.getElementsByTagName('audio')[0];
        audio(media, 'http://dict.youdao.com/dictvoice?type=2&audio=' + currentWord.word);
        $("#zh").html(currentWord.meanZh.replace(/[\r\n]/g, '<br>'));
        $("#en").html(currentWord.meanEn.replace(/[\r\n]/g, '<br>'));

        // updateWord('level', Math.min(currentWord.level+1, 10));
        checkMemory("#next_right");
    }
});

// In the following line, you should include the prefixes of implementations you want to test.
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

if (currentBook) {
    initIndexDB("init", null, null);
}

function checkMemory(next) {
    $(next).parent().children('div').hide();
    $(next).show();
    switchTab("#remember");
}

function switchTab(next) {
    $("#myTab").children('li.active').removeClass('active');
    var temp = "#remember#recall".indexOf(next) > -1 ? "#recite":next;
    $("#myTab").children('li').children('a[href='+temp+']').parent().addClass('active');
    $("#myTabContent").children('div.active').removeClass('active');
    $(next).attr("class", "tab-pane fade in active");
}

function putWords() {

    $.ajax({
        method: "post",
        url : "/reciteword/putWords",
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
        url : "/reciteword/getWords/"+currentBook,
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
                        var f = false, item = e.target.result;
                        ++i;
                        if (typeof(item) == "undefined") {
                            getNext();
                        } else {
                            if ('level' in serverData[word] && 
                                serverData[word]['level']) {
                                if (item['level'] < 10 && serverData[word]['level'] > 9)
                                    myBooks[currentBook].finish++;
                                if (item['level'] == 0 && serverData[word]['level'] > 0)
                                    myBooks[currentBook].view++;
                                if (serverData[word][ele] > item[ele])
                                    item['level'] = serverData[word]['level'];
                                f = true;
                            }

                            for (var ele in serverData[word]) {
                                if (ele === "level") continue;
                                if (serverData[word][ele] && serverData[word][ele] !== "") {
                                    item[ele] = serverData[word][ele];
                                    f = true;
                                }
                            }
                            if (f)
                                itemStore.put(item).onsuccess = getNext;
                            else
                                getNext();

                        }
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
            switchTab("#myBooks");
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
    if (currentBook !== $(obj).attr("id")) {
        console.log('更换单词书, 先同步数据');
        putWords();
        currentBook = $(obj).attr("id").trim();
        localStorage.setItem("book", currentBook);
        initIndexDB("init", null, null);
    }

    switchTab("#recite");
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
                var item = e.target.result;
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

            switchTab("#myBooks");
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
            $("#myBooks2").append(showBook(currentBook, myBooks[currentBook]));
            switchTab("#myBooks");
        }
    }
}

function updateProgress(total, view, finish) {
    $("#currentBook").html("当前单词书:" + currentBook);
    $("#currentBookNum").html("总单词数:" + total);
    $("#currentBookView").html("浏览个数:" + view);
    $("#currentBookFinish").html("掌握个数:" + finish);
    $("#currentBook").parent().children('img').attr("alt", currentBook);
}

function downloadbook(obj, name) {

    var xhr = new XMLHttpRequest();
    xhr.open('GET', name+"?v="+Math.round(Math.random()*10000), true);
    xhr.responseType = 'arraybuffer';
    currentBook = $(obj).attr("id").trim();
    localStorage.setItem("book", currentBook);

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
    switchTab("#recite");
    completeNumber = 0;
}

function start() {
    var i = 0, store, transaction, cursorRequest, now = new Date().getTime(),
        interval = [10, 30, 120, 300, 1800, 43200, 86400, 172800, 345600, 604800];

    transaction = db.transaction(["word"], "readwrite");
    store = transaction.objectStore("word");
    cursorRequest = store.index('level').openCursor(null, 'next');

    unit = [];

    function memorySort(a, b) {
        var va = (a.time||now)+interval[a.level] * 1000,
            vb = (b.time||now)+interval[a.level] * 1000;
        return va - vb;
    }

    cursorRequest.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
            if (cursor.value.level < 10) {
                if (unit.length < limit) {
                    unit.push(cursor.value);
                } else {
                    var e = cursor.value, last = unit[unit.length - 1];
                    var v = (e.time || now)+interval[e.level] * 1000;
                    var vlast =(last.time || now)+interval[last.level] * 1000;
                    if (v == vlast) {
                        var prob = 1.0 * limit / myBooks[currentBook].num;
                        if (Math.random() < prob) {
                            unit[i%limit] = cursor.value;
                        }
                    } else if(v < vlast) {
                        unit.push(cursor.value);
                        unit = unit.sort(memorySort);
                        unit.pop();
                    }
                }
                i++;
            }
            cursor.continue();
        }
        else { reciteMainView(); }
    };
}

function renderLenovo(text) {
    var temple = '<p style="color:{0}; display:inline-block">';
    var result = "<h3>" +
    text.replace(/<r>/g, temple.format("red"))
        .replace(/<b>/g, temple.format("blue"))
        .replace(/<g>/g, temple.format("green"))
        .replace(/<\/[grb]>/g,'</p>')
        .replace(/[\(（]/g, temple.format("red"))
        .replace(/[\)）]/g, '</p>')
        .replace(/[\r\n]/g, '<br>')
        + "</h3>";
    return result;
}

function isStem(w1, w2) {
    var i = 0;
    for (i = 0; i < w1.length; i++)
        if (i >= w2.length || w1[i] != w2[i])
            break;
    return 3 * i > w1.length * 2.0;
}

function genBlank(sentence, word) {
    var c = true, words = sentence.split(/[ ,.!?;]/),
        input = $('<input type="text" class="form-control" id="word_quiz"/>');
    if (word.indexOf(' ') > -1) { sentence = sentence.replace(word, "___"); }
    else {
        for (var i in words) {
            if (isStem(word.toLowerCase(), words[i].toLowerCase())) {
                if (c) {
                    currentWord.temp = words[i];
                    c = false;
                }
                sentence = sentence.replace(words[i], "___");
            }
        }
    }

    input.focus();
    var span = $("<p>" + sentence + "<br><br></p>");
    span.append(input);
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

    if (!currentWord.level || currentWord.level === 0) {
        myBooks[currentBook].view++;
        $("#currentBookView").html(" 浏览个数:" + myBooks[currentBook].view);
        currentWord.level = 1;
    }

    if ((mode === "zh-en" || (mode === "mix" && currentWord.level > 2 &&
        Math.random() > 0.5)) && currentWord.example.trim().length > 3) {
        var word = currentWord.word;
        $(".uk").attr('data-rel', '');
        $(".us").attr('data-rel', '');

        var examples = currentWord.example.trim().split(/[\r\n]/g),
            s = examples.length,
            example = examples[Math.floor(Math.random() * s)],
            sentence = example.split(":")[1],
            meaning = example.split(":")[0],
            blank_div;
        if (!sentence) console.log(example + ' -----' + currentWord.example)
        blank_div = genBlank(sentence, currentWord.word);
        if (!meaning.trim()) meaning = currentWord.meanZh;
        $(".word").html(meaning);
        $("#fuzzy").text("验证(enter)");
        $("#sorry").text("不知道(下或alt)");
        $("#ok").hide();
        $(".learning-speaker").hide();
        $(".word_quiz").html(blank_div);
        $(".word_quiz").show();
        setTimeout(function(){
            $("#word_quiz").focus();
        }, 0);
    } else {
        $(".word").html(currentWord.word);
        var media = document.getElementsByTagName('audio')[0];
        audio(media, 'http://dict.youdao.com/dictvoice?type=2&audio=' + currentWord.word);
        $("#zh").html(currentWord.meanZh.replace(/[\r\n]/g, '<br>'));
        $("#en").html(currentWord.meanEn.replace(/[\r\n]/g, '<br>'));
        $("#fuzzy").text("模糊(左或j)");
        $("#sorry").text("不知道(下或k)");
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
        updateWord('selfLenovo', text);
        textarea.val("");
        $('#note').hide();
    }
}

function createNote() {
    $('#note').show();
}
