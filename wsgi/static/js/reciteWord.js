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

    $("#ok").click(function (){
        $("#next_right").css("display", "inline-block");
        $("#next_wrong").css("display", "none");
        $("#recall").attr("class", "tab-pane fade");
        $("#remember").attr("class", "tab-pane fade in active");
    });

    $("#fuzzy").click(function (){
        $("#next_right").css("display", "inline-block");
        $("#next_wrong").css("display", "none");
        $("#recall").attr("class", "tab-pane fade");
        $("#remember").attr("class", "tab-pane fade in active");
    });

    $("#sorry").click(function (){
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = Math.max(currentWord.level/2, 10);
        itemStore.put(currentWord);
        $("#next_right").css("display", "none");
        $("#next_wrong").css("display", "inline-block");
        $("#recall").attr("class", "tab-pane fade");
        $("#remember").attr("class", "tab-pane fade in active");
    });

    function animate() {
        progress.animate({
            width: Math.floor(100.0*completeNumber/limit) + "%"
        }, 100, function() {
            percent.text(completeNumber);
        });
    }

    $("#master").click(function (){
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = 10;
        itemStore.put(currentWord);
        unit.splice(index, 1);

        completeNumber++;
        myBooks[currentBook].finish += 1;
        $("#currentBookFinish").html(" 记忆个数:" + myBooks[currentBook].finish);

        localStorage.setItem('myBooks', JSON.stringify(myBooks));

        animate();

        if (completeNumber >= limit) {
            sessionEnd();
            progress.animate({
                width: Math.floor(100.0*completeNumber/limit) + "%"
            }, 100, function() {
                percent.text(completeNumber);
            })
        }
        else {
            reciteMainView();

        }
    });

    $("#right").click(function (){
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

            animate();
        }

        if (completeNumber >= limit) {
            sessionEnd();
        }
        else {
            reciteMainView();
        }
    });

    $("#wrong").click(function (){
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level =  Math.max(currentWord.level/2, 10);
        itemStore.put(currentWord);
        reciteMainView();
    });

    $("#trivial").click(function (){
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = 11;
        itemStore.put(currentWord);
        unit.splice(index, 1);
        completeNumber++;
        myBooks[currentBook].finish += 1;
        localStorage.setItem('myBooks', JSON.stringify(myBooks));
        $("#currentBookFinish").html(" 记忆个数:" + myBooks[currentBook].finish);

        animate();

        if (completeNumber >= limit) {
            sessionEnd();
        }
        else {
            reciteMainView();
        }
    });

    $("#next").click(function (){
        reciteMainView();
    });

    $(".audio").click(function (){
        var media = $(this).get(0).getElementsByTagName('audio')[0];
        audio(media, $(this).data("rel"));
    });

    progress = $('.progress-bar');
    percent = $('.percentage');
    stripes = $('.progress-stripes');
    stripes.text('////////////////////////');

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
// DON'T use "var indexedDB = ..." if you're not in a function.
// Moreover, you may need references to some window.IDB* objects:
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
// (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

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

        if (type == "newbook" && !dbExists) {
            console.log("create");
            createNewBook(content, name);
        }

        if (dbExists) {
            console.log('数据库已存在， 不需要重新下载， 连上就行');
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
        jsonObj[cols[i]] = item[i] || "";
    }
    return jsonObj;
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
    return text.replace(/<r>/, '<p style="color:red;display:inline-block">')
        .replace(/<b>/, '<p style="color:blue;display:inline-block">')
        .replace(/<g>/, '<p style="color:green;display:inline-block">')
        .replace(/<\/g>/,'</p>').replace(/<\/r>/,'</p>').replace(/<\/b>/,'</p>');
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
        $("#lenovo").html(renderLenovo(currentWord.selfLenovo)+renderLenovo(currentWord.lenovo));
    }
    else {
        $("#lenovo").html(renderLenovo(currentWord.lenovo));
    }
    $('#node').hide();
    $("#remember").attr("class", "tab-pane fade");
    $("#recite").attr("class", "tab-pane fade");
    $("#recall").attr("class", "tab-pane fade in active");
}

function addLenovo(obj) {
    var text = $(obj).parent().get(0).getElementsByTagName('textarea')[0].value;
    console.log(text);
    if (text !== "") {
        $("#lenovo").html(renderLenovo(text)+renderLenovo(currentWord.lenovo));
    }
}

function createNote() {
    $('#note').show();
}

function updateSetting() {
    limit = $("#unitNum").val() || 20;
}