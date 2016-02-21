var seconds = 0, minutes = 0, hours = 0,
    time = document.body.getElementsByTagName('time')[0],
    t;

function add() {
    seconds++;
    if (seconds >= 60) {
        seconds = 0;
        minutes++;
        if (minutes >= 60) {
            minutes = 0;
            hours++;
        }
    }
    
    time.textContent = (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") + " : " + (seconds > 9 ? seconds : "0" + seconds);

    timer();
}

function timer() {
    t = setTimeout(add, 1000);
}

function stopTimer() {
    clearTimeout(t);
}

function resetTimer() {
    time.textContent = "00 : 00";
    seconds = 0; minutes = 0; hours = 0;
}