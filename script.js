var textElem = document.getElementById("animate")

var on = false;
function toggle(){
	if (on){
		textElem.innerHTML = "(¬‿¬)"	
	}
	else { 
		textElem.innerHTML = "(◕‿◕)"
	}
	on = !on
}

setInterval(toggle, 1500)
