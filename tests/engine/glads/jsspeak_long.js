// messages longer than the server's 2000-byte reads are cut, so replies stay in step: the
// gladiator still answers ("depois") after the long message
function loop() {
    const time = getSimTime();
    if (time > 0.5 && time < 0.8)
        speak('ã'.repeat(3000));
    if (time > 2 && time < 2.3)
        speak('depois');
    moveTo(5, 5);
}
