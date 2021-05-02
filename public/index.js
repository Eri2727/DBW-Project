//Verifies the image that the user inputs as their profile picture
function checkFile(input) {
    var file = input.files[0];
    var fileType = file["type"];
    var validImageTypes = ["image/jpeg", "image/png"];

    if ($.inArray(fileType, validImageTypes) < 0) {
        alert("Invalid File. Please attach a valid .png or .jpeg file.");
        $("#inputImage").val(null);
        location.reload();
    }

    if (input.files && input.files[0] ) {
        var reader = new FileReader();

        reader.onload = function (e) {

            $('#imageAdded').attr('src', e.target.result);
            $('#imageAdded').removeAttr('hidden');
        }

        reader.readAsDataURL(input.files[0]);
    }
}

//Opens and closes the add new chat pop up
function overlay() {
    //addChat is the popup to create a new chat
    el = $(".addChat");
    elForm = $(".addChatForm");

    //if is open then "closes"
    if(el.css("display") != "none"){
        el.css("display","none");
        elForm.attr("disabled");
    } else {
        el.css("display","block");
        elForm.attr("enabled");
    }
}

const socket = io();

$("#searchUser").on("keyup" ,function (){ //when is typing trigger

    if($("#searchUser").val().length === 1) //if user just started typing, this way it wont always be emitting the request
        socket.emit("request usernames");

    // when the usernames are received
    socket.on("response usernames",function(usernameList){

        //puts every username as a recomendation
        $("#searchUser").attr("list", usernameList);
    });


});




