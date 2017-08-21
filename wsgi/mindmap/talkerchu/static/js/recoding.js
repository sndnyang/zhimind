var recorder;

function startRecording() {
    HZRecorder.get(function (rec) {
        recorder = rec;
        recorder.start();
    });
}

function uploadAudio(obj) {
    recorder.stop();
    //提交到服务器
    recorder.upload("/talkerchu/speech/recognition", function (data) {
        if (!data) {
            alert("语音提交失败");
            return;
        }
        if (data.err_no) {
            alert(data.err_msg + ' 语音编号： ' + data.sn);
            return;
        }

        $(obj).parent().children("input").val(data.result[0]);
        // var datalist = $(obj).parent().parent().children("datalist");
        // for (var i = 0; i < 5; i++)
        //    datalist.append($('<option value="{0}"/>'.format(data.result[i])));
    });
}