
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
    $('#addedUsers ul').html(''); //clears the stuff inside the div
    $('#newChatUsernameInput').val(''); //clears the username input
    $('.search-error-message').html(''); //removes error message
});

//if esc is pressed popup closes and triggers a click on the close
$('#newChat').on('keydown', function(event){
   if(event.key === 'Escape'){
       $('.closeNewChat').trigger('click');
   }
});

//when you add a user it checks if its valid and adds it to the list
$('#addUserButton').on('click', () => {

    const usernameInput = $('#newChatUsernameInput').val(); //gets the username to be added

    socket.emit("request usernames");

    // when the usernames are received
    socket.once("response usernames",function(data){

        const usernameList = data.usernames;

        const capitalizedName = usernameInput.charAt(0).toUpperCase() + usernameInput.slice(1).toLowerCase();

        if(data.currUser === capitalizedName){

            $('.search-error-message').html('<div class="alert alert-danger" role="alert">' +
                '  You can\'t add yourself' +
                '</div>');


        } else if (usernames.includes(capitalizedName)){
            $('.search-error-message').html('<div class="alert alert-danger" role="alert">' +
                '  Username already added' +
                '</div>');

        } else if(usernameList.includes(capitalizedName)){
            $('#newChatUsernameInput').val(''); //clears the username input

            usernames.push(capitalizedName);

            $('#addedUsers ul').append("<li>" + capitalizedName + "<input type='button' class=\"removeUser\" value='&times;'></input></li>");

        } else {
            $('.search-error-message').html("<div class=\"alert alert-warning\" role=\"alert\">" +
                "  User does not exist" +
                "</div>");
        }
    });


});

$("#newChatUsernameInput").on('keydown', function(event){
    if(event.key == 'Backspace') {
        $('.search-error-message').html('');
    }
});

//if Enter is clicked whilst inside text input then it triggers a click on the add user button
$("#newChatUsernameInput").on('keydown', function(event){
   if(event.key == 'Enter') {
       event.preventDefault();
       $('#addUserButton').trigger('click');
   }
});

//when the username input box becomes focused asks and receives the usernames to autocomplete
$("#newChatUsernameInput").on("focus" ,function (event){ //when is typing trigger

    socket.emit("request usernames");

    // when the usernames are received
    socket.once("response usernames", function (data) {

        const usernameList = data.usernames;

        //removes self from list of recommendations
        const indexOfSelf = usernameList.indexOf(data.currUser);
        usernameList.splice(indexOfSelf, 1);

        let datalist = '';
        usernameList.forEach(element => {
            datalist += '<option>' + element + '</option>';
        });
        $(".input-group #userList").html('');
        //puts every username as a recommendation
        $(".input-group #userList").html(datalist);
        // $("#newChatUsernameInput").attr("list", usernameList);
    });

});

//Waits for a click on every element with the class removeUser (buttons) inside the element with the id newChat (a div)
$('#newChat').on('click', '.removeUser', function() {
    const usernameToBeRemoved = $(this).parent().text();
    const usernameIndex = usernames.indexOf(usernameToBeRemoved);
    usernames.splice(usernameIndex, 1);
    $(this).parent().remove();
});

//Button to create a new chat emits a request to create a new chat adding the usernames
$('#createNewChat').on('click', () => {

    if(usernames.length === 0){
        $('.search-error-message').html('<div class="alert alert-danger" role="alert">' +
            'You cannot create a chat with yourself.' + '</div>');
    } else {

        socket.emit("newChat", usernames);

    }

});

socket.on('appendChat', (chat) => {

    const chatList = $("#chatList");

    chatList.prepend("<li id=\"" + chat.id + "\" class=\"nav-item chatItem\">\n" +
        "    <h6 class=\"chatTitle\">" + chat.name + "</h6>\n" +
        "</li>");

    $('.closeNewChat').trigger('click');

});

//Variable to store the currently selected chat
if(!window.sessionStorage.getItem("currentChat")) {
    window.sessionStorage.setItem("currentChat", "0");
}

//Loads the chat that was selected before the reload
let currentChat = window.sessionStorage.getItem("currentChat");
if(currentChat !== "0"){
    socket.emit("getChat", currentChat);
}

//asks for the chat that was clicked
$('#chatList').on('click', '.chatItem', function() {

    window.sessionStorage.setItem("currentChat", $(this).attr('id'));

    socket.emit("getChat", $(this).attr('id'));

});

//receives the chat that was requested
socket.on("getChat", (me, chat, userImage) => {

    $("#chatTitle").text(chat.name);

    //Clears the messages before appending
    $("#messages").html('');

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    chat.messages.forEach(message => {

        let sentClass = "";

        if(message.sender === me){
            sentClass = " sent";
        }

        let timeStamp = "";

        if((new Date().getFullYear() - message.date.getFullYear()) > 0){ //if more than a year has passed
            timeStamp = message.date.getDate() + "/" + message.date.getMonth() + 1 + "/" + message.date.getFullYear();
            //timeStamp = day/month/year

        } else if((new Date().getMonth() - message.date.getMonth()) > 0){ // If a month has passed
            timeStamp = message.date.getDate() + " " + months[message.date.getMonth()];
            //timeStamp = day month
        } else if((new Date().getDate() - message.date.getDate()) > 0) { // if a day has passed
            timeStamp = (new Date().getDate() - message.date.getDate()) + " days ago";
            //timeStamp = x days ago
        } else {
            timeStamp = message.date.getHours() + ":" + message.date.getMinutes();
            //timeStamp = hours:minutes;
        }

        $("#messages").append("<div class=\"message\"" + sentClass + ">\n" +
            "            <img  src=\"data:image/" + userImage[message.sender].img.contentType + ";base64," +
            userImage[message.sender].img.data.toString('base64') + "\" alt=\"Avatar\"style=\"width:100%;\">\n" +
            "            <p>" + message.body + "</p>\n" +
            "            <span class=\"name-left\">" + message.sender + "</span>\n" +
            "            <span class=\"time-right\">" + timeStamp + "</span>\n" +
            "        </div>");

    });

});

//if the message input is focused and ENTER is clicked, checks if the input is empty, if not triggers a click on the send button
$('#message').on('keydown', () => {


});