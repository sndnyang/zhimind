
/*
Tipue Search 3.1
Copyright (c) 2013 Tipue
Tipue Search is released under the MIT License
http://www.tipue.com/search
*/


var tipuesearch_stop_words = ["and", "be", "by", "do", "for", "he", "how", "if", "is", "it", "my", "not", "of", "or", "the", "to", "up", "what", "when"];

var tipuesearch_replace = {"words": [
     {"word": "tipua", replace_with: "tipue"},
     {"word": "javscript", replace_with: "javascript"}
]};

var tipuesearch_stem = {"words": [
     {"word": "e-mail", stem: "email"},
     {"word": "javascript", stem: "script"},
     {"word": "javascript", stem: "js"}
]};

var tipuesearch_pages;

exclude_pages = ['/archives.html', '/tags.html', '/index.html', '/categories.html', '/search.html'];

function showGetResult()
{
     var result = new Array();
     var scriptUrl = '/sitemap';
     $.ajax({
        url: scriptUrl,
        type: 'GET',
        dataType: 'json',
        async: false,
        success: function(data) {
            result = data.data;
        },
        error: function() {
            alert('An error occurred while processing XML file.'); 
        }
     });
     return result;
}

//var r = showGetResult();
//tipuesearch_pages = r;
