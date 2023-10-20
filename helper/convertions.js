
export const fileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve([reader.result, file.name]);
        reader.onerror = error => reject(error);
      });
}
export const dataURLtoFile=(dataurl, filename,type)=> {
    let arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    let imageFile = new File([u8arr], filename, {type:type??mime});
    return imageFile
}

