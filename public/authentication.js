
$(".info-item .btn").on("click", function(){
    $(".container-md").toggleClass("log-in");
    $(".registerError").remove();
});

$(".container-form .btn").on("click", function(){

    setTimeout(()=>{
        $(".container-md").addClass("active");
    }, 1000);
});

function checkFile(input) {
    const file = input.files[0];
    const fileType = file["type"];
    const validImageTypes = ["image/jpeg", "image/png"];

    if ($.inArray(fileType, validImageTypes) < 0) {
        alert("Invalid File. Please attach a valid .png or .jpeg file.");
        $("#inputImage").val(null);
        // location.reload();
    }
    if(input.files[0].size >= 16777216){
        alert("Image is too big. Max 16mb.");
        $("#inputImage").val(null);
        // location.reload();
    }

    if (input.files && input.files[0] ) {
        const reader = new FileReader();

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
