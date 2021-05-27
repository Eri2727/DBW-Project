
$(".info-item .btn").on("click", function(){
    $(".container").toggleClass("log-in");
});
$(".container-form .btn").on("click", function(){
    $(".container").addClass("active");
});

function checkFile(input) {
    const file = input.files[0];
    const fileType = file["type"];
    const validImageTypes = ["image/jpeg", "image/png"];

    if ($.inArray(fileType, validImageTypes) < 0) {
        alert("Invalid File. Please attach a valid .png or .jpeg file.");
        $("#inputImage").val(null);
        location.reload();
    }
    if(input.files[0].size >= 16777216){
        alert("Image is too big. Max 16mb.");
        $("#inputImage").val(null);
        location.reload();
    }

    if (input.files && input.files[0] ) {
        var reader = new FileReader();

        reader.onload = function (e) {

            let previewImage = $('#imageAdded');

            previewImage.attr('src', e.target.result);
            previewImage.removeAttr('hidden');
        }

        reader.readAsDataURL(input.files[0]);
    }
}

//clears the sessionStorage when user logs in
window.sessionStorage.clear();
