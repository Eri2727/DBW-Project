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

const socket = io();

const usernames = [];

//when the popup is closed
$('.closeNewChat').on('click', () => {
    usernames.splice(0,usernames.length) //clears the array (usernames =[]) -> splice(index of where to start, number of items to delete)
    $('#addedUsers .list-group').html(''); //clears the stuff inside the div
    $('#newChatUsernameInput').val(''); //clears the username input

});

//when you add a user
$('#addUserButton').on('click', () => {

    const usernameInput = $('#newChatUsernameInput').val(); //gets the username to be added

    socket.emit("request usernames");

    // when the usernames are received
    socket.once("response usernames",function(data){


        const usernameList = data.usernames;

        if(data.currUser === usernameInput){
            alert("You can't add yourself");

        } else if(usernameList.includes(usernameInput)){
            $('#newChatUsernameInput').val(''); //clears the username input

            usernames.push(usernameInput);

            $('#addedUsers .list-group').append("<li class=\"list-group-item\">\n" +
                "                            <input class=\"form-check-input me-1 text-end\" type=\"checkbox\" checked=\"true\">\n" +
                "                            " + usernameInput + "\n" +
                "                        </li>");

        } else {
            txt="User does not exist";

        }
    });


});



$("#searchUser").on("keyup" ,function (){ //when is typing trigger

    if($("#searchUser").val().length === 1) //if user just started typing, this way it wont always be emitting the request
        socket.emit("request usernames");

    // when the usernames are received
    socket.on("response usernames",function(data){

        const usernameList = data.usernames;

        //puts every username as a recomendation
        $("#searchUser").attr("list", usernameList);
    });


});




