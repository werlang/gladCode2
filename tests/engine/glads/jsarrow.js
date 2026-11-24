let start = true;
const loop = () => {
    if (start && moveTo(12.5, 12.5))
        start = false;
    else if (getTargetX() !== false)
        attackRanged(getTargetX(), getTargetY());
    else
        turn(5);
};
