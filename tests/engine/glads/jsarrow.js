let start = true;
const loop = () => {
    if (start && moveTo(12.5, 12.5))
        start = false;
    else if (!start)
        turn(5);
};
