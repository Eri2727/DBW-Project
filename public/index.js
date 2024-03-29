const socket = io();

const usernames = [];

//when the popup is closed
$('.closeNewChat').on('click', () => {
    usernames.splice(0,usernames.length) //clears the array (usernames =[]) -> splice(index of where to start, number of items to delete)
    $('.addedUsers ul').html(''); //clears the stuff inside the div
    $('#newChatUsernameInput').val(''); //clears the username input
    $('.search-error-message').html(''); //removes error message
    $('#newChatName').val('');
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

            $('#newChat .search-error-message').html('<div class="alert alert-danger" role="alert">' +
                '  You can\'t add yourself' +
                '</div>');


        } else if (usernames.includes(capitalizedName)){
            $('#newChat .search-error-message').html('<div class="alert alert-danger" role="alert">' +
                '  Username already added' +
                '</div>');

        } else if(usernameList.includes(capitalizedName)){
            $('#newChat #newChatUsernameInput').val(''); //clears the username input

            usernames.push(capitalizedName);

            $('#newChat .addedUsers ul').append("<li>" + capitalizedName + "<input type='button' class=\"removeUser\" value='&times;'></input></li>");

        } else {
            $('#newChat .search-error-message').html("<div class=\"alert alert-warning\" role=\"alert\">" +
                "  User does not exist" +
                "</div>");
        }
    });


});

//if Enter is clicked whilst inside text input then it triggers a click on the add user button || if user starts deleting text, error is removed if there is any
$("#newChatUsernameInput").on('keydown', function(event){
    if(event.key == 'Backspace') {
        $('.search-error-message').html('');
    }
    if(event.key == 'Enter') {
        event.preventDefault();
        $('#addUserButton').trigger('click');
    }
});

//when the username input box becomes focused asks and receives the usernames to autocomplete
$("#newChatUsernameInput").on("focus" ,function (event){ //when is typing trigger

    socket.emit("request usernames");

    // when the usernames are received (once, so that its not always receiving usernames)
    socket.once("response usernames", function (data) {

        const usernameList = data.usernames;

        let datalist = '';
        usernameList.forEach(element => {
            datalist += '<option>' + element + '</option>';
        });
        $(".input-group #userList").html('');
        //puts every username as a recommendation
        $(".input-group #inviteUserList").html(datalist);
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

        let chatName = $("#newChatName").val();

        chatName = (chatName === "") ? null : chatName;

        socket.emit("newChat", usernames, chatName);

    }

});

socket.on('appendChat', (chat) => {

    const chatList = $("#chatList");
    let senderLastMessage = "";
    let lastMessage = "was created";

    if(chat.messages[chat.messages.length-1] !== undefined){
        lastMessage = chat.messages[chat.messages.length-1].body;
        senderLastMessage = chat.messages[chat.messages.length-1].sender + ": ";
    }

    chatList.prepend("<li id=\"" + chat._id + "\" class=\"nav-item chatItem\">\n" +
        "    <h6 class=\"chatTitle\">"+ chat.name + "</h6>\n" +
        "    <span class=\"badge\">1</span>\n" +
        "    <p class=\"lastMessage\">\n" +
        "<span class=\"username\">" + senderLastMessage + "</span>" + lastMessage +
        "    </p>\n" +
        "    <p class=\"timeLastMessage\">\n" +
        getTimeStamp(chat.lastChanged) +
        "    </p>\n" +
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
    $(".chatSettings").show();
    socket.emit("getChat", currentChat);
}

//asks for the chat that was clicked
$('#chatList').on('click', '.chatItem', function() {

    window.sessionStorage.setItem("currentChat", $(this).attr('id'));

    $(".chatSettings").show();

    $(this).children(".badge").text("");

    socket.emit("getChat", $(this).attr('id'));

});

let userImages = [];
let myUsername;

//receives the chat that was requested
socket.on("getChat", (me, chat, userImage) => {

    //If the user changes the id with developer tools
    if(chat === null && userImage === null){
        $("#chatTitle").text("UNAUTHORIZED - Don't be a smart ass...");
        window.sessionStorage.clear();
        $('#messages').html(null);
        $('#messageInput').html(null);
    } else {

        myUsername = me;

        userImages = userImage;

        $("#chatTitle").text(chat.name);

        //Clears the messages before appending
        $("#messages").html('');

        chat.messages.forEach(message => {

            appendMessage(message);

        });

        $('#messageInput').html("<div class='form-control'><div id='replied-message'></div><textarea maxlength=\"132\" rows=\"2\" class=\"form-control\" autocomplete=\"off\" id=\"message\" placeholder=\"Type your message here\" ></textarea></div>\n" +
            "        <button class=\"btn btn-outline-secondary\" type=\"button\" id=\"sendMessage\"><i class=\"far fa-paper-plane\"></i></button>");

    }

    if(chat.messages.length !== 0){

        scrollToMessage();
    }

});

//if the message input is focused and ENTER is clicked, checks if the input is empty, if not triggers a click on the send button
$('#messageInput').on('keydown', '#message', (event) => {

    if(event.key == 'Enter') {
        event.preventDefault(); //prevents ENTER from creating a new line
        $('#sendMessage').trigger('click');
    }
});

$("#messageInput").on("click", '#sendMessage', () => {

    //id of the replied message
    let replyID = "";

    if($('#replied-message .message').length !== 0)
        replyID = $('#replied-message .message').attr('id').replace("r-","");

    //ACABAR O REPLY E DEPOIS FAZER O RECUSAR INVITE

    let currentChat = window.sessionStorage.getItem("currentChat");
    let messageBody = $("#message").val();

    $("#message").val("");

    //if the message has at least one non blank character
    if(messageBody.trim().length > 0){
        clearReply();
        socket.emit("newMessage", currentChat, messageBody, replyID);

    }

});

socket.on('newMessage', (message, chatId) => {

    let chat = $('#' + chatId);

    //moves chat to the begining
    $("#chatList").prepend(chat);
    chat.children(".lastMessage").html("<span class=\"username\">" + message.sender + ":</span>" + " " + message.body);
    chat.children(".timeLastMessage").text(getTimeStamp(message.date));

    if(window.sessionStorage.getItem("currentChat") === chatId){
        appendMessage(message);
    } else {
        let badge = chat.children(".badge");
        let newBadgeNum = badge.text() === "" ? "1" : parseInt(badge.text()) + 1
        badge.text(newBadgeNum);
    }



    scrollToMessage(message._id);

});

function scrollToMessage(id){
    //if id is null then message to go to will be the last one

    let top = (id !== undefined) ? $('#' + id).position().top : $('#messages').children().last().position().top;

    if(id) {
        top -= 150;
    }

    $('html, #messages').animate({
        scrollTop: $("#messages").scrollTop() + top
    }, 1000);
}

function appendMessage(message){

    let sentClass = "";

    if (message.sender === myUsername) {
        sentClass = " sent";
    }

    let image = userImages[message.sender].data;

    let formattedMessage = "";

    formattedMessage = "<div id='" + message._id + "' class=\"message" + sentClass + "\">\n";

    if(message.repliedMessage != null  && message.repliedMessage !== "") {

        let aux = $('#' + message.repliedMessage).clone();

        aux.attr('id', 'r-' + aux.attr('id'));

        aux.children(".btn, .message, div").remove();

        formattedMessage += aux.prop('outerHTML');

    }

    let reactions = "";
    if(message.reactions){
        message.reactions.forEach(reaction => {
            let reactionHoverText = getUsernamesTextForReaction(reaction.usernames, reaction.emoji);

            reactions += "<span>" + reaction.emoji + "<span class=\"badge\">" + reaction.usernames.length + "</span><div class='reaction-users'>" + reactionHoverText + "</div></span>"
        });
    }

    formattedMessage += "<img  src=\"data:/" + userImages[message.sender].contentType + ";base64," +
        image + "\" alt=\"Avatar\">\n" +
        "            <p class='messageBody'>" + message.body + "</p>\n" +
        "            <span class=\"name-left\">" + message.sender + "</span>\n" +
        "            <div class=\"reactions-given\">" + reactions +
        "            </div>  " +
        "            <span class=\"time-right\">" + getTimeStamp(message.date) + "</span>\n" +
        "            <button class=\"btn reply-btn\" title='Reply'>\n" +
        "                   <i class=\"fas fa-reply\"></i>\n" +
        "            </button>\n" +
        "            <div class=\"reactions\">\n" +
        "              <a class=\"btn reaction-icon\">\n"  +
        "               <i class=\"bi bi-stars\"></i>\n" +
        "               <div class=\"reaction-drop\">\n" +
        "                 <div class=\"reaction-list\">\n" +
        "                                       <span>&#128578;</span>\n" +
        "										<span>&#128515;</span>\n" +
        "										<span>&#128514;</span>\n" +
        "										<span>&#128518;</span>\n" +
        "										<span>&#128521;</span>\n" +
        "										<span>&#128557;</span>\n" +
        "										<span>&#128532;</span>\n" +
        "										<span>&#128561;</span>\n" +
        "										<span>&#128566;</span>\n" +
        "										<span>&#128577;</span>\n" +
        "										<span>&#128579;</span>\n" +
        "                                       <span>&#129313;</span>\n" +
        "										<span>&#129312;</span>\n" +
        "										<span>&#128064;</span>\n" +
        "										<span>&#128077;</span>\n" +
        "										<span>&#128078;</span>\n" +
        "										<span>&#128151;</span>\n" +
        "					</div>" +
        "				</div>" +
        "			</a>" +
        "        </div>";

    $("#messages").append(formattedMessage).show("slow");

}

function getTimeStamp(date){
    let timeStamp = "";
    let messageDate = new Date(date);

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    if ((new Date().getFullYear() - messageDate.getFullYear()) > 0) { //if more than a year has passed
        timeStamp = messageDate.getDate() + "/" + messageDate.getMonth() + 1 + "/" + messageDate.getFullYear();
        //timeStamp = day/month/year

    } else if ((new Date().getDate() - messageDate.getDate()) > 0) { // if a day has passed
        timeStamp = (new Date().getDate() - messageDate.getDate()) + " days ago";
        //timeStamp = x days ago
    } else {
        // timeStamp = messageDate.getHours() + ":" + messageDate.getMinutes();
        timeStamp = messageDate.toLocaleTimeString(navigator.language, {
            hour: '2-digit',
            minute: '2-digit'
        })
        //timeStamp = hours:minutes;
    }

    return timeStamp;
}

//Reply to message
$("#messages").on("click", '.reply-btn', function () {

    //reply = div of the message that the button was clicked
    let reply = $(this).parent().prop('outerHTML');


    $("#replied-message").html(reply);
    //reply is the message in html

    let messageInReply = $("#replied-message .message");

    messageInReply.children("div, button").remove();


    //change the id of the reply message so that it doesnt have the same id as the original message
    messageInReply.attr('id', "r-" + messageInReply.attr('id'));

    //change height and insert the button in the replied message
    $('#messages').css('height', '50vh');

    //add the button
    $('#replied-message').append("<button class=\"btn removeReply\" title=\"Remove Reply\">\n" +
        "                   <i class=\"bi bi-x\"></i>\n" +
        "            </button>");

    $("#message").trigger("focus");

});

function clearReply() {
    //clear the replied message div and change the height
    $('#replied-message').html(null);

    $('#messages').css('height', '67vh');
}

$('#messageInput').on('click', '.removeReply', function () {

    clearReply();

});

$('#messageInput').on('click', '#replied-message .message', function (){

    //get the id to scroll to (we need to remove the r- that we placed in the beginning of the id
    let idToScroll = $(this).attr('id').replace('r-', '');

    scrollToMessage(idToScroll);
});

$('#messages').on('click', '.message .message', function () {
    let idToScroll = $(this).attr('id').replace('r-', '');

    scrollToMessage(idToScroll);
});


//Invite related stuff
socket.on('newInvite' , (newName) => {

    if($("#invites").text().trim() === "No invites yet")
        $("#invites").html(null);

    $('#invites').append("<li class=\"invite\">\n" +
        newName +
        "                                    <i class=\"bi bi-check-circle text-success accept\"></i>\n" +
        "                                    <i class=\"bi bi-x-circle text-danger refuse\"></i>\n" +
        "                                </li>");

    let badge = $("#invitesButton .badge");
    let newBadgeNum = badge.text() === "" ? "1" : parseInt(badge.text()) + 1
    badge.text(newBadgeNum);


});

$('#invites').on('click', 'i', function() {

    //get the index of the li that had its button clicked (its the same index as in the database)
    let inviteIndex = $(this).parent().index();

    //remove the list item that was clicked
    if($(".invite").length > 1)
        $(".invite").get(inviteIndex).remove();
    else
        $(".invite").remove();

    let newBadgeNum = parseInt($("#invitesButton .badge").text()) - 1;

    if(newBadgeNum === 0)
        newBadgeNum = "";

    //if there are no more invites, then remove the dot
    if(($("#invitesButton .badge").text(newBadgeNum)));

    if($(this).hasClass("accept"))
        socket.emit("acceptChat", inviteIndex);
    else if($(this).hasClass("refuse"))
        socket.emit("refuseChat", inviteIndex);


});

//change chat name
$('#changeChatName').on('click', () => {

    let currentTitle = $('#chatTitle').text();

    //Change title to input
    $('#chatTitle').html('<input type="text" placeholder="'+ currentTitle +'" id="newChatName"><i class="bi bi-pencil changeName"></i><i class="bi bi-x cancelChangeName"></i>')

    $('#chatTitle input').trigger('focus');

})


$(document).on('keydown', "#chatTitle input", (event) => {
    if($('#chatTitle').children('input').length && event.key === 'Escape'){
        $('#chatTitle .cancelChangeName').trigger('click');
    } else if($('#chatTitle').children('input').length && event.key === 'Enter'){
        $('#chatTitle .changeName').trigger('click');
    }
});

$('#chatTitle').on('click', '.changeName', () => {

    let newTitle = $('#chatTitle input').val();
    if(newTitle !== "") {
        $('#chatTitle').html(newTitle);
        socket.emit("changeChatName", window.sessionStorage.getItem("currentChat"), newTitle);
    }else {
        alert("Can't change chat name to empty");
    }

});

$('#chatTitle').on('click', '.cancelChangeName', () => {

    let previousTitle = $('#chatTitle input').attr('placeholder');
    $('#chatTitle').html(previousTitle);

});



$('#confirmLeaveButton').on('click', () => {

    let currentChat = window.sessionStorage.getItem("currentChat");

    socket.emit('leaveChat', currentChat, function(){
        $('#chatTitle').html("Choose a chat or create one");    //change title
        $('.chatSettings').hide();   //hide settings
        $('#confirmLeave').modal('hide');   //hide modal
        window.sessionStorage.setItem("currentChat", "0");  //set currentChat to 0
        $('#messages').html(null);  //clear messages
        $('#messageInput').html(null);  //clear messages
        $('#' + currentChat).remove();
    });

});


$("#messages").on('click', ".reactions span", function (){
    $(this).parents(".reaction-drop").hide(500);
    let message = $(this).parents(".message");
    let reactions = message.children(".reactions-given");
    let reaction = $(this).text();

    //if message already has this reaction
    let reactionInReactions = reactions.children("span:contains(" + reaction +")");
    let reactionBadge = reactionInReactions.children(".badge");
    let reactionHoverText = reactionInReactions.children(".reaction-users");

    socket.emit("addReaction", window.sessionStorage.getItem("currentChat"), message.attr('id'), reaction, function(usernames, add, maxReactions) {
        if(maxReactions){   //if message already has the max number of reactions (12)
            //Says that the maximum number of reaction has been reached
            let reactionsContent = reactions.html();
            reactions.html("<p>Reached the maximum of reactions</p>");
            setTimeout(() => {
                reactions.html(reactionsContent);
            }, 1000);
        } else {
            if (add) {
                //if this emoji was already in the message
                if (reactions.text().indexOf(reaction) !== -1) {
                    reactionBadge.text(parseInt(reactionBadge.text()) + 1);
                } else {
                    reactions.append("<span>" + reaction + "<span class=\"badge\">1</span><div class='reaction-users'></div></span>");

                }
                reactionInReactions = reactions.children("span:contains(" + reaction + ")");
                reactionHoverText = reactionInReactions.children(".reaction-users");

                reactionHoverText.text(getUsernamesTextForReaction(usernames, reaction));
            } else {
                reactionBadge.text(parseInt(reactionBadge.text()) - 1);
                if (parseInt(reactionBadge.text()) === 0) {
                    reactionInReactions.remove();
                }
            }
        }
    });

});

$("#messages").on('click', '.reactions-given > span', function(){
    let clickedText = $(this).text();

    let emoji = [...clickedText][0];
    $(this).parents(".message").children(".reactions").find(".reaction-drop span:contains(" + emoji + ")").trigger('click');
});

function getUsernamesTextForReaction(usernames, reaction){
    let hoverText = "";
    for (var usernameIndex = 0; usernameIndex < usernames.length - 2; usernameIndex++) {
        hoverText += usernames[usernameIndex] + ", ";
    }

    if(hoverText !== "") {
        hoverText.splice(hoverText.length - 2, 2); //Remove the ", " if the hoverText has already inserted users (has more than one user)
        usernameIndex++;
        hoverText += " and ";
    }

    hoverText += usernames[usernameIndex] + " reacted with " + reaction;

    return hoverText;
}

//show and hide the options for reactions
$("#messages").on('mouseenter', ".reaction-icon", function(){
    $(this).children(".reaction-drop").show();
});

$("#messages").on('click', ".reaction-icon i", function(){
    $(this).children(".reaction-drop").show();
});

$("#messages").on('mouseleave', ".reaction-icon", function(){
    $(this).children(".reaction-drop").hide()
});

//show the users that reacted
$("#messages").on('mouseenter', ".reactions-given > span", function(){
    $(this).children(".reaction-users").show();
});
//hide after showing
$("#messages").on('mouseleave', ".reactions-given > span", function(){
    $(this).children(".reaction-users").hide();
})

//Invite users
$("#openInviteUsers").on('click', function(){

    socket.emit("getOtherUsernames", window.sessionStorage.getItem("currentChat"), function(usernamesToBeAdded, me, usernamesInChat){
        let datalist = '';
        usernamesToBeAdded.forEach(element => {
            datalist += '<option>' + element + '</option>';
        });

        $("#usersInChat ul").html(null);
        usernamesInChat.forEach(username => {
            $("#usersInChat ul").append("<li>" + username + "</li>");
        })

        $("#autocompleteUsernameList").html(datalist);
    });

});

//get the autocomplete
$("#addUserToInvite").on('click', function(){

    socket.emit("getOtherUsernames", window.sessionStorage.getItem("currentChat"), function(usernamesToBeAdded, me, usernamesInChat){

        let usernameInput = $("#inviteUsersUsernameInput").val();

        const capitalizedName = usernameInput.charAt(0).toUpperCase() + usernameInput.slice(1).toLowerCase();

        if(me === capitalizedName){

            $('#inviteUsers .search-error-message').html('<div class="alert alert-danger" role="alert">' +
                '  You can\'t add yourself' +
                '</div>');


        } else if (usernamesInChat.includes(capitalizedName) || usernames.includes(capitalizedName)){
            $('#inviteUsers .search-error-message').html('<div class="alert alert-danger" role="alert">' +
                '  Username already added' +
                '</div>');

        } else if(usernamesToBeAdded.includes(capitalizedName)){
            $('#inviteUsers #inviteUsersUsernameInput').val(null); //clears the username input

            usernames.push(capitalizedName);


            $('#inviteUsers .addedUsers ul').append("<li>" + capitalizedName + "<input type='button' class=\"removeUser\" value='&times;'></input></li>");

        } else {
            $('#inviteUsers .search-error-message').html("<div class=\"alert alert-warning\" role=\"alert\">" +
                "  User does not exist" +
                "</div>");
        }

    });

});

$('#inviteUsers').on('click', '.removeUser', function() {
    const usernameToBeRemoved = $(this).parent().text();
    const usernameIndex = usernames.indexOf(usernameToBeRemoved);
    usernames.splice(usernameIndex, 1);
    $(this).parent().remove();
});

$("#inviteUsersUsernameInput").on('keydown', function(event){
    if(event.key === 'Enter'){
        $("#addUserToInvite").trigger('click');
    }
    if(event.key === 'Backspace'){
        $('#inviteUsers .search-error-message').html(null);
    }
});

$("#inviteUsers").on('keydown', (event) => {
    if(event.key === 'Escape')
        $('#inviteUsers .btn-danger').trigger('click');
});

$('#inviteUsers .btn-danger').on('click', () => {
    $('#inviteUsers .search-error-message').html(null);
    $('#inviteUsers ul').html(null);
    $("#inviteUsersUsernameInput").val(null);
    usernames.splice(0, usernames.length);

});

$('#inviteUsers .btn-primary').on('click', () => {

    if(usernames.length === 0){
        $('.search-error-message').html('<div class="alert alert-danger" role="alert">' +
            'No one to add' + '</div>');
    } else {
        socket.emit("addToChat", window.sessionStorage.getItem("currentChat"), usernames);
        $('#inviteUsers .btn-danger').trigger('click');
    }

});