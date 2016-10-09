var db, limit = 20;
var unit = [];
var openRequest;
var myBooks = JSON.parse(localStorage.getItem("myBooks")) || {};
var currentBook = localStorage.getItem("book");
var currentWord, index;
var completeNumber = 0;
var reciteTimes = {};

$(document).ready(function(){
    if (!currentBook || currentBook === "") {
        //$("#start").html("开始学习 (当前未选中单词书，请先到词库选择)");
        $("#currentBook").html('未选中单词书，请先到词库选择');
    }
    else {
        var num = myBooks[currentBook].num, finish = myBooks[currentBook].finish;
        updateProgress(num, finish);
    }

    $(document).keydown(function (event) {
        if ($("textarea").is(":focus") || $("textarea").is(":focus")) {
            return true;
        }
        var section = $("div.active").attr("id"),
            forget = $("#next_right").css("display");
        if(event.keyCode == 37) {
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
            audio($('audio')[0], $('a.us').data("rel"));
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
        $("#next_right").css("display", "inline-block");
        $("#next_wrong").css("display", "none");
        $("#recall").attr("class", "tab-pane fade");
        $("#remember").attr("class", "tab-pane fade in active");
    }

    $("#fuzzy").click(fuzzy);

    function sorry() {
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = Math.max(currentWord.level/2, 10);
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
        itemStore.put(currentWord);
        unit.splice(index, 1);

        completeNumber++;
        myBooks[currentBook].finish += 1;
        $("#currentBookFinish").html(" 记忆个数:" + myBooks[currentBook].finish);

        localStorage.setItem('myBooks', JSON.stringify(myBooks));

        if (completeNumber >= limit) { sessionEnd(); }
        else { reciteMainView(); }
        animate();
    }
    function right() {
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = Math.min(currentWord.level+1, 10);
        itemStore.put(currentWord);
        reciteTimes[currentWord.word] = reciteTimes[currentWord.word] + 1 || 1;

        if (currentWord.level === 10 || reciteTimes[currentWord.word] === 3) {
            unit.splice(index, 1);
            completeNumber++;

            if (currentWord.level === 10) {
                myBooks[currentBook].finish += 1;
                $("#currentBookFinish").html(" 记忆个数:" + myBooks[currentBook].finish);
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
        currentWord.level =  Math.max(currentWord.level/2, 10);
        itemStore.put(currentWord);
        reciteMainView();
    }
    $("#wrong").click(wrong);

    function trivial() {
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = 11;
        itemStore.put(currentWord);
        unit.splice(index, 1);
        completeNumber++;
        myBooks[currentBook].finish += 1;
        localStorage.setItem('myBooks', JSON.stringify(myBooks));
        $("#currentBookFinish").html(" 记忆个数:" + myBooks[currentBook].finish);

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

    for (var book in myBooks) {
        var num = myBooks[book].num, finish = myBooks[book].finish,
            newBook = "<div><a href='javascript:void(0)' class='storedBook'" +
                " onclick='chooseBooks(this)'>" + book + "</a> 总单词数:" + num +
                ", 已完成:" + finish + "</div>";

        $("#myBooks").append(newBook);
    }
});

// In the following line, you should include the prefixes of implementations you want to test.
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

if (currentBook) {
    initIndexDB("init", null, null);
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
        currentBook = $(obj).html();
        localStorage.setItem("book", currentBook);

        initIndexDB("init", null, null);

        var num = myBooks[currentBook].num, finish = myBooks[currentBook].finish;
        updateProgress(num, finish);
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
        cols = ['id', 'word', 'level', 'lenovo', 'etyma', 'meanZh', 'meanEn', 'example', 'selfLenovo'];
    for (var i = 1; i < cols.length; i++) {
        if (i == 2) jsonObj[cols[i]] = 0;
        else jsonObj[cols[i]] = item[i] || "";
    }
    return jsonObj;
}

function updateItemJson(jsonObj, item) {
    var flag = false, cols = ['id', 'word', 'level', 'lenovo', 'etyma',
                              'meanZh', 'meanEn', 'example'];
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
                updateProgress(i, myBooks[currentBook].finish);
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

            myBooks[currentBook] = {'num': i, 'finish': 0};
            localStorage.setItem('myBooks', JSON.stringify(myBooks));

            updateProgress(i, 0);

            var newBook = "<div><a href='javascript:void(0)' class='storedBook'" +
                " onclick='chooseBooks(this)'>" + currentBook + "</a> 总单词数:"
                 + i +  ", 已完成:" + 0 + "</div>";

            $("#myBooks").append(newBook);

            $("#myTab").children('li.active').removeClass('active');
            $("#myTab").children('li').children('a[href="#myBooks"]').parent().addClass('active');

            $("#books").attr("class", "tab-pane fade");
            $("#myBooks").attr("class", "tab-pane fade in active");
        }
    }
}

function updateProgress(total, finish) {
    $("#currentBook").html("单词书:" + currentBook);
    $("#currentBookNum").html(" 总单词数:" + total);
    $("#currentBookFinish").html(" 记忆个数:" + finish);
}

function downloadbook(obj, name) {

    var xhr = new XMLHttpRequest();
    xhr.open('GET', name, true);
    xhr.responseType = 'arraybuffer';
    currentBook = $(obj).html();
    localStorage.setItem("book", $(obj).html());

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
    alert("恭喜您完成本次 " + limit + "个单词的背诵");
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

    cursorRequest.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor && unit.length < limit) {
            unit.push(cursor.value);
            i += 1;
            cursor.continue();
        }
        else {
            reciteMainView();
        }
    };
}

function renderLenovo(text) {
    var result = "<h3>" + text.replace(/<r>/g, '<p style="color:red;display:inline-block">')
        .replace(/<b>/g, '<p style="color:blue;display:inline-block">')
        .replace(/<g>/g, '<p style="color:green;display:inline-block">')
        .replace(/<\/g>/g,'</p>').replace(/<\/r>/g,'</p>').replace(/<\/b>/g,'</p>')
        .replace(/\(/g, '<p style="color:red;display:inline-block">')
        .replace(/\)/g, '</p>') + "</h3>";
    //console.log(result);
    return result;
}

function reciteMainView() {
    index = Math.round(Math.random() * (unit.length - 1));
    currentWord = unit[index];

    $(".word").html(currentWord.word);
    $(".uk").attr('data-rel', 'http://dict.youdao.com/dictvoice?type=1&audio=' + currentWord.word);
    $(".us").attr('data-rel', 'http://dict.youdao.com/dictvoice?type=2&audio=' + currentWord.word);
    $("#etyma").html(currentWord.etyma);
    $("#example").html(currentWord.examle);
    $("#zh").html(currentWord.meanZh);
    $("#en").html(currentWord.meanEn);
    $("#youdao").attr("href", "http://dict.youdao.com/search?q=" + currentWord.word);
    $("#youdao").attr("target", "_blank");
    var media = document.getElementsByTagName('audio')[0];
    audio(media, 'http://dict.youdao.com/dictvoice?type=2&audio=' + currentWord.word);

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

function addLenovo(obj) {
    var textarea = $(obj).parent().children("textarea"),
        text = textarea.val();
    if (text !== "") {
        $("#lenovo").html("自创记忆法:"+renderLenovo(text)+"参考记忆法:"+
            renderLenovo(currentWord.lenovo));
        currentWord.selfLenovo = text;
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        itemStore.put(currentWord);
        textarea.val("");
    }
}

function createNote() {
    $('#note').show();
}

function updateSetting() {
    limit = $("#unitNum").val() || 20;
    $("#recite").attr("class", "tab-pane fade in active");
    $("#setting").attr("class", "tab-pane fade");
}