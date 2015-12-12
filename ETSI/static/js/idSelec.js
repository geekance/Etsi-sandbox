function buttonGrid() {
	// création de la grille
    var gridWidth = container.offsetWidth;
    var gridHeight = container.offsetHeight;
    var nbCell = nbUser;
    var factor = Math.floor(Math.sqrt(nbCell));
    while (nbCell % factor != 0) { //factorisation
        factor = factor - 1;
    }
    // nombre de colones/rangées
    if (gridHeight > gridWidth) {
        var nbCol = factor;
        var nbRow = nbCell / factor;
    } else {
        var nbCol = nbCell / factor;
        var nbRow = factor;
    }
    // tailles des cellules
    var cellWidth = gridWidth / nbCol;
    var cellHeight = gridHeight / nbRow;
    for (var i = 1; i <= nbRow; i++) {
        for (var j = 1; j <= nbCol; j++) {
            //création des éléments du DOM 
            var divCell = document.createElement('div');
            var button = document.createElement('div');
            container.appendChild(divCell);
            divCell.appendChild(button);
            //param des "céllules" 
            divCell.id = (j + (i * nbCol)) - nbCol;
            divCell.className = 'cell';
            divCell.style.width = cellWidth + 'px';
            divCell.style.height = cellHeight + 'px';
            divCell.style.display = 'inline-block';
            //param des bouttons 
            button.className = 'button';
            button.innerHTML = divCell.id;
            //style du bouton 
            var min = Math.min(cellWidth, cellHeight);
            var borderWidth = 1;
            var margin = 10;
            var fontSize = min * 1.7;
            button.style.width = cellWidth - margin + 'px';
            button.style.height = cellHeight - margin + 'px';
            button.style.borderRadius = 6 + 'px';
            button.style.marginTop = (cellHeight - button.offsetHeight) / 2 + 'px';
            //typo
            button.style.textAlign = 'center';
            button.style.whiteSpace = 'nowrap';
            button.style.fontSize = fontSize + 'px';
            button.style.overflow = "hidden";
            if (divCell.id >= 10) {
                button.style.letterSpacing = "-10px";
            }
            if (cellWidth < cellHeight) {
                button.style.lineHeight = ((cellHeight + button.offsetHeight) / 2.5) - (borderWidth * 2) + 'px';
            } else {
                button.style.lineHeight = ((cellHeight + button.offsetHeight) / 3) - (borderWidth * 2) + 'px';
            }
            //event
            button.onclick = function() {
                userId = this.parentNode.id;
                socket.emit('getListener', this.parentNode.id);
                window.container.remove()
                console.log("je suis le bouton " + this.parentNode.id);
            }
        }
    }
}
window.addEventListener("resize", function() {
    var cells = document.getElementsByClassName("cell");
    while (cells.length > 0) {
        cells[0].parentNode.removeChild(cells[0]);
    }
    buttonGrid();
});

