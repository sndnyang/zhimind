var collegeList = null;

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
        major_map = {"1": "计算机/信息技术/软件", "2": "航空航天",
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
    degree = $('<td>{0}</td>'.format(degree_map[item.degree] || ''));
    major = $('<td>{0}</td>'.format(major_map[item.major] || ''));
    gpa = $('<td>{0}</td>'.format(item.gpa || ''));
    tuition = $('<td>{0}</td>'.format(item.tuition || ''));
    deadline = $('<td>{0}</td>'.format(item.deadline || ''));
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
    gpa_p = item.gpa_p || '';
    gre_p = item.gre_p || '';
    eng_p = item.eng_p || '';
    deadline_p = item.deadline_p || '';
    docum_p = item.docum_p || '';
    int_docum_p = item.int_docum_p || '';

    var p = '<p></p>', other = $(p), page = $(p);
    other.append('成绩单认证：{0} 推荐信：{1} 存款证明：{2}'.format(evalue, rl, finance));
    page.append($('<p><a href="{0}">GPA网页</a></p>'.format(gpa_p)));
    page.append($('<p><a href="{0}">GRE网页</a></p>'.format(gre_p)));
    page.append($('<p><a href="{0}">英文要求网页</a></p>'.format(eng_p)));
    page.append($('<p><a href="{0}">截止日期网页</a></p>'.format(deadline_p)));
    page.append($('<p><a href="{0}">标准材料网页</a></p>'.format(docum_p)));
    page.append($('<p><a href="{0}">国际学生材料网页</a></p>'.format(int_docum_p)));
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
            var data = result;
            for (var i in data) {
                var item = fillInformation(data[i], i, n);
                var toggle = fillExtraInfo(data[i], i);
                $("#collegeList").append(item);
                $("#collegeList").append(toggle);
            }
        }
    });   
}

$(document).ready(function () {
    var options = {
        dataType: 'json',
        success: function (data) {
            if (data.error) {
                alert(data.error);
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

