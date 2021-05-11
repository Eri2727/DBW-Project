
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


