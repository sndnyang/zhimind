var collegeList = null;
var filterList = null;

function fillInformation(item, i, n) {
    var name, degree, major, gpa, tuition, deadline, other,
        expand, edit, tr = $('<tr></tr>');
    if (screen.width < 767) {
        var index = item.name.indexOf('(');
        if (index < 0) {
            temp = item.name;
        } else {
            temp = item.name;
            temp = temp.substring(temp.indexOf('(')+1, temp.indexOf(')'));
        }
    } else {
        temp = item.name;
    }
    name = $('<td>{0}</td>'.format(temp || ''));

    var degree_map = {'1': '本科', '2': '硕士', '3': '博士'},
        major_map = {"1-1": "计算机科学(CS)",
                      "1-2": "计算机工程(CE)", 
                      "1-3": "软件工程(SE)", 
                      "1-4": "信息技术(IT)",
                      "2": "航空航天",
                      "3": "Chemical/Petroleum",
                      "4": "Civil/Construction/Structural",
                      "5": "Electrical/Electronics/Telecomm",
                      "6": "Industrial/Operations",
                      "7": "Mechanical/Automobile",
                      "8": "Biomedical/Biotechnical",
                      "9": "Management Information System (MIS)",
                      "10": "Biological/Agricultural",
                      "11": "Engineering Management (MEM)",
                      "12": "Environmental/Mining",
                      "13": "Financial Engineering",
                      "14": "Material Science and Engineering",
                      "15": "Analytics",
                      "16": "Nano/Nuclear/Power",
                      "17": "Healthcare",
                      "18": "Nursing",
                      "19": "Dental",
                      "20": "Veterinary Science",
                      "21": "Pharmacy",
                      "22": "Commerce/Finance/Actuarial",
                      "23": "Government/Administrative",
                      "24": "Pure Sciences",
                      "25": "Arts/Media",
                      "26": "Education/Languages/Counselling",
                      "27": "Humanities/Journalism",
                      "28": "Management",
                      "29": "Finance",
                      "30": "Marketing",
                      "31": "Human Resources",
                      "32": "International Management",
                      "33": "General Law",
                      "34": "International Law",
                      "35": "Architecture"}

    temp = degree_map[item.degree] || '';
    if (screen.width < 767) {
        temp = temp.substr(0,1);
    }
    degree = $('<td>{0}</td>'.format(temp));

    temp = major_map[item.major] || '';
    if (screen.width < 767) {
        var index = temp.indexOf('(');
        if (index >= 0) {
            temp = temp.substring(temp.indexOf('(')+1, temp.indexOf(')'));
        }
    }
    major = $('<td>{0}</td>'.format(temp));
    gpa = $('<td>{0}</td>'.format(item.gpa || ''));
    tuition = $('<td>{0}</td>'.format(item.tuition || ''));

    var md = getmd(), tmp_dl = item.fall || '';
    if (tmp_dl) tmp_dl += '(秋)';
    if ('fall' in item && item.fall > md)
        tmp_dl = item.fall + '(秋)';
    else if ('spring' in item && item.spring > md)
        tmp_dl = item.spring + '(春)';

    deadline = $('<td>{0}</td>'.format(tmp_dl));
    expand = $('<td><a data-toggle="collapse" aria-expanded="false" class="False collapsed btn-success" href="#collapse{0}" aria-controls="collapse{1}">展开</a></td>'.format(i, i));
    tr.append(name);
    tr.append(degree);
    tr.append(major);
    tr.append(gpa);
    tr.append(tuition);
    tr.append(deadline);
    tr.append(expand);

    if (n) {
        var pass = $('<td><a href="javascript:void(0);" onclick="approve(\'{0}\',0)" class="btn-success">通过</a></td>'.format(item.id));
        var rej = $('<td><a href="javascript:void(0);" onclick="approve(\'{0}\',1)" class="btn-danger">删除</a></td>'.format(item.id));
        tr.append(pass);
        tr.append(rej);
    } else {
        var edit_url = "/collegeForm/";
           
        if (item.id) {
            edit_url += item.id;
        } else {
            edit_url += item.name;
        }
        edit = $('<td><a href="{0}" target="_blank" class="btn-success">编辑</a></td>'.format(edit_url));
        tr.append(edit);
    }
    return tr;
}

function approve(id, n) {
    $.ajax({
        method: "post",
        url : '/collegeData/approve',
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify({'id': id, 'type': n}),
        success : function (result){
            var data = result;
            if (data.error) {
                alert(data.error);
                return;
            }
            alert('success');
        }
    });   
}

function fillExtraInfo(item, i) {
    var toggle = $('<div class="panel-collapse collapse" data-expanded="false" role="tabpanel" id="collapse{0}" aria-labelledby="heading{1}" aria-expanded="false" style="height: 0px;"></div>'.format(i, i));
    var toefl, ielts, gre, evalue, rl, finance,
        gpa_p, gre_p, eng_p, deadline_p, docum_p, int_docum_p;
    toefl = item.toefl || '';
    ielts = item.ielts || '';
    gre = item.gre || '';
    evalue = item.evalue || '';
    rl = item.rl || '';
    finance = item.finance || '';
    gpa_p = item.gpa_url || '';
    gre_p = item.gre_url || '';
    eng_p = item.eng_url || '';
    tuition_p = item.tuition_url || '';
    deadline_p = item.deadline_url || '';
    docum_p = item.docum_url || '';
    int_docum_p = item.int_docum_url || '';

    var p = '<p></p>', other = $(p), page = $(p);
    other.append('成绩单认证：{0} 推荐信：{1} 存款证明：{2}'.format(evalue, rl, finance));
    page.append($('<p><a href="{0}" target="_blank">GPA网页</a></p>'.format(gpa_p)));
    page.append($('<p><a href="{0}" target="_blank">GRE网页</a></p>'.format(gre_p)));
    page.append($('<p><a href="{0}" target="_blank">英文要求网页</a></p>'.format(eng_p)));
    page.append($('<p><a href="{0}" target="_blank">学费网页</a></p>'.format(tuition_p)));
    page.append($('<p><a href="{0}" target="_blank">截止日期网页</a></p>'.format(deadline_p)));
    page.append($('<p><a href="{0}" target="_blank">标准材料网页</a></p>'.format(docum_p)));
    page.append($('<p><a href="{0}" target="_blank">国际学生材料网页</a></p>'.format(int_docum_p)));
    toggle.html('托福： {0}  雅思： {1}  GRE: {2}'.format(toefl, ielts, gre));
    toggle.append(other);
    toggle.append(page);
    return toggle;
}

function getCollegeList(n) {
    if (n == 0) n = ''; 
    $.ajax({
        method: "get",
        url : '/collegeList' + n,
        contentType: 'application/json',
        dataType: "json",
        success : function (result){
            var data = result.sort(sortName);
            collegeList = result;
            filterList = result;
            for (var i in data) {
                if (!('degree' in data[i])) continue;
                var item = fillInformation(data[i], i, n);
                var toggle = fillExtraInfo(data[i], i);
                $("#collegeList").append(item);
                $("#collegeList").append(toggle);
            }
            for (var i in data) {
                if ('degree' in data[i]) continue;
                var item = fillInformation(data[i], i, n);
                var toggle = fillExtraInfo(data[i], i);
                $("#collegeList").append(item);
                $("#collegeList").append(toggle);
            }
        }
    });   
}

function validate_deadline(obj) {
    var s = $(obj).val(), ext,
        date = s.substr(0, 5);
    if (!/(0[1-9]|1[0-2]).(0[1-9]|3[01]|[12][0-9])/.test(date)) {
        alert('截止日期格式不对 ' + s);
        $(obj).focus();
    }
    if (s.length > 5 && (s.length < 12 || s[5] != '(' || 
         !/(0[1-9]|1[0-2]).(0[1-9]|3[01]|[12][0-9])/.test(s.substr(5, 7)))) {
        alert('申奖截止日期格式不对 ' + s.substring(5, s.length));
        $(obj).focus();
    }
}

function sortName(a, b) {
    return a.name > b.name? 1:-1;
}

function sortGPA(a, b) {
    if (!a.gpa) a.gpa = 100;
    if (!b.gpa) b.gpa = 100;
    return a.gpa - b.gpa;
}

function sortTuition(a, b) {
    if (!a.tuition) a.tuition = 10000000;
    if (!b.tuition) b.tuition = 10000000;
    return a.tuition - b.tuition;
}

function getmd() {
    var date = new Date(), month = date.getMonth(), day = date.getDate(),
        md;
    if (month < 10) month = '0'+(month+1);
    if (day < 10) day = '0'+day;
    md = '{0}.{1}'.format(month, day);
    return md
}

function sortDeadline(a, b) {
    var md = getmd(), da = a.fall || '13.01', db = b.fall || '13.02';
    if (a.fall > md) {
        da = a.fall
    } else if (a.fall <= md && a.spring > md) {
        da = a.spring
    } else if (a.fall <= md && a.spring < md) {
        da = 14 + ' ' + a.fall;
    }
    if (b.fall > md) {
        db = b.fall
    } else if (b.fall <= md && b.spring > md) {
        db = b.spring
    } else if (b.fall <= md && b.spring <= md) {
        db = 14 + ' ' + b.fall;
    }
    return da+'' > db+'' ? 1:-1;;
}

function filterCollege(l, col, t) {
    var data = [], prefix = t+'-';
    for (var i in l) {
        if (col !== 'deadline' && col in l[i]) {
            if (t) {
                if (l[i][col] == t || 
                        l[i][col].substr(0, prefix.length) == prefix)
                   data.push(l[i]);
            }
            else {
                data.push(l[i]);
            }
        }
        if (col == 'deadline' && (('fall' in l[i] && l[i].fall)
                || ('spring' in l[i] && l[i].spring)))
            data.push(l[i]);
    }
    return data;
}

function sortCollege(col) {
    $("#collegeList").html("");
    var data = filterCollege(filterList, col, 0);
    console.log(data.length);
    if (col === "gpa") {
        data.sort(sortGPA);
    } else if (col === "tuition") {
        data.sort(sortTuition);
    } else if (col === "deadline") {
        data.sort(sortDeadline);
    }
    for (var i in data) {
        var item = fillInformation(data[i], i, 0);
        var toggle = fillExtraInfo(data[i], i);
        $("#collegeList").append(item);
        $("#collegeList").append(toggle);
    }
}

function filter() {
    $("#collegeList").html("");
    var degree = parseInt($("#degreeName").val()), 
        major = parseInt($("#majorName").val());
    filterList = filterCollege(filterCollege(collegeList, 'degree',degree), 'major',major);
    for (var i in filterList) {
        var item = fillInformation(filterList[i], i, 0);
        var toggle = fillExtraInfo(filterList[i], i);
        $("#collegeList").append(item);
        $("#collegeList").append(toggle);
    }
}

$(document).ready(function () {
    var options = {
        dataType: 'json',
        success: function (data) {
            if (data.error) {
                alert(data.error);
                document.getElementById("vericode")
                    .setAttribute('src','/verifycode?random='+Math.random());
                return;
            }
            alert('请等待审核，准备跳转...');
            window.location.href = "/college.html";
        }
    };
    $("#college").submit(function (){
        $(this).ajaxSubmit(options);
        return false;
    });
});

