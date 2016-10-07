var db, limit = 20;
var unit = [];
var openRequest;
var currentBook = localStorage.getItem("book");
var currentWord, index;
var completeNumber = sessionStorage.getItem("finish") || 0;
var reciteTimes = sessionStorage.getItem("times") || {};

$(document).ready(function(){
    $("#start").html("开始学习 (当前单词书为: " + currentBook + " )");
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

    $("#master").click(function (){
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = 10;
        itemStore.put(currentWord);
        unit.splice(index, 1);

        completeNumber++;
        progress.animate({
            width: Math.floor(100.0*completeNumber/limit) + "%"
        }, 100, function() {
            percent.text(completeNumber);
        })

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
            $("#remember").attr("class", "tab-pane fade");
            $("#recall").attr("class", "tab-pane fade in active");
            $('#node').hide();
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
            progress.animate({
                width: Math.floor(100.0*completeNumber/limit) + "%"
            }, 100, function() {
                percent.text(completeNumber);
            })
        }

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
            $("#remember").attr("class", "tab-pane fade");
            $("#recall").attr("class", "tab-pane fade in active");
            $('#node').hide();
        }
    });

    $("#wrong").click(function (){
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level =  Math.max(currentWord.level/2, 10);
        itemStore.put(currentWord);
        reciteMainView();
        $("#remember").attr("class", "tab-pane fade");
        $("#recall").attr("class", "tab-pane fade in active");
        $('#node').hide();
    });

    $("#trivial").click(function (){
        var transaction = db.transaction(["word"], "readwrite");
        var itemStore = transaction.objectStore("word");
        currentWord.level = 11;
        itemStore.put(currentWord);
        unit.splice(index, 1);
        completeNumber++;
        progress.animate({
            width: Math.floor(100.0*completeNumber/limit) + "%"
        }, 100, function() {
            percent.text(completeNumber);
        })
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
            $("#remember").attr("class", "tab-pane fade");
            $("#recall").attr("class", "tab-pane fade in active");
            $('#node').hide();
        }
    });

    $("#next").click(function (){
        reciteMainView();
        $('#node').hide();
        $("#remember").attr("class", "tab-pane fade");
        $("#recall").attr("class", "tab-pane fade in active");
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
    progress.animate({
        width: Math.floor(100.0*completeNumber/limit) + "%"
    }, 100, function() {
        percent.text(completeNumber);
    })
});

// In the following line, you should include the prefixes of implementations you want to test.
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
// DON'T use "var indexedDB = ..." if you're not in a function.
// Moreover, you may need references to some window.IDB* objects:
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
// (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

if (currentBook) {
    initIndexDB("null", null, null);
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
        console.log("continue? " + type + dbExists);
        if (dbExists) {
            console.log('数据库已存在， 不需要重新下载， 连上就行');
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
            console.log('populate complete  ' + i);
        }
    }
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

    $("#recite").attr("class", "tab-pane fade");
    $("#recall").attr("class", "tab-pane fade in active");

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