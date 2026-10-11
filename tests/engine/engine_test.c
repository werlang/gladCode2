/*
Unit tests for the C simulation engine (payload/). They include the engine sources the same way
gladCodeServerMain.c does and call the server functions directly, without sockets or client threads.

Run from the repository root (no local compiler needed):
    docker run --rm -v "$PWD":/w -w /w gladcode2-vm sh -c \
        "gcc -o /tmp/engine_test tests/engine/engine_test.c -lm -lpthread && /tmp/engine_test"
*/
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdarg.h>
#include <math.h>
#include <pthread.h>
#include <time.h>
#include <unistd.h>
#include "../../Payload/explodeFunc.c"
#include "../../Payload/gladCodeGlobals.c"
#include "../../Payload/gladCodeServerCore.c"
#include "../../Payload/gladCodeServerAPI.c"

int failures = 0;

#define CHECK(cond, ...) do { \
    if (!(cond)) { failures++; printf("FAIL %s:%d: ", __FILE__, __LINE__); printf(__VA_ARGS__); printf("\n"); } \
} while (0)

#define NEAR(a, b) (fabs((a) - (b)) < 0.001)

//creates nglad gladiators with a valid 12/12/10 build, already out of setup (lvl 1), all at the arena centre facing north
void resetArena(int n){
    int i;
    free(g);
    free(go);
    g = NULL;
    go = NULL;
    p = NULL;
    nglad = n;
    sandbox = 0;
    for (i=0 ; i<n ; i++){
        int id = createGladiator(1000 + i);
        setSTR(id, 12);
        setAGI(id, 12);
        setINT(id, 10);
        (g+id)->lvl = 1;
        (g+id)->x = 12.5;
        (g+id)->y = 12.5;
        (g+id)->head = 0;
    }
}

void testCalcCost(){
    CHECK(calcCost(0) == 0, "calcCost(0)");
    CHECK(calcCost(12) == 18, "calcCost(12) = %d", calcCost(12));
    CHECK(calcCost(10) == 14, "calcCost(10) = %d", calcCost(10));
    //used to recurse forever (negative) or blow the stack (huge)
    CHECK(calcCost(-1) == 0, "calcCost(-1) = %d", calcCost(-1));
    CHECK(calcCost(2000000000) > 50, "calcCost(huge) must exceed the 50 point budget");

    resetArena(1);
    (g+0)->lvl = 0;
    CHECK(checkSetup(0) == 1, "12/12/10 is a valid build");
    (g+0)->lvl = 0;
    (g+0)->STR = -1;
    CHECK(checkSetup(0) == 0, "negative STR must be rejected");
}

void testExplodeItemName(){
    char name[20];
    int lvl = -1;
    CHECK(explodeItemName("pot-hp-3", name, sizeof(name), &lvl) == 1 && strcmp(name, "hp") == 0 && lvl == 3,
        "pot-hp-3 -> name=%s lvl=%d", name, lvl);
    CHECK(explodeItemName("heal", name, sizeof(name), &lvl) == 0, "no dash");
    CHECK(explodeItemName("pot-hp", name, sizeof(name), &lvl) == 0, "single dash");
    CHECK(explodeItemName("", name, sizeof(name), &lvl) == 0, "empty");
    CHECK(explodeItemName("pot-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-1", name, sizeof(name), &lvl) == 0, "name longer than buffer");

    resetArena(1);
    CHECK(itemEffect(0, "heal") == 0, "itemEffect with a malformed name");
}

void testBlockSeam(){
    resetArena(2);
    //attack from 10 degrees, defender facing 350: 20 degrees apart, inside the 60 degree half view, full block
    addBuff(1, BUFF_RESIST, 5, 0.5);
    (g+1)->hp = 1000;
    (g+1)->head = 350;
    (g+1)->lasthitangle = 10;
    dealDamage(0, 1, 100);
    CHECK(NEAR((g+1)->hp, 950), "facing the hit across north should block fully, hp=%f", (g+1)->hp);

    //facing away: half block
    (g+1)->hp = 1000;
    (g+1)->head = 190;
    dealDamage(0, 1, 100);
    CHECK(NEAR((g+1)->hp, 925), "facing away should half block, hp=%f", (g+1)->hp);
}

void testResistClamp(){
    resetArena(2);
    addBuff(1, BUFF_RESIST, 5, 0.1 + 300.0 / (300 + 16));
    CHECK((g+1)->buffs[BUFF_RESIST].value <= MAX_RESIST, "resist must be clamped, got %f", (g+1)->buffs[BUFF_RESIST].value);
    (g+1)->hp = 1000;
    (g+1)->head = 0;
    (g+1)->lasthitangle = 0;
    dealDamage(0, 1, 100);
    CHECK((g+1)->hp < 1000, "a blocked hit must never heal, hp=%f", (g+1)->hp);
}

void testSetSlots(){
    char s[100];
    resetArena(1);
    (g+0)->lvl = 0;
    strcpy(s, "-1,-1,-1,-1");
    setSlots(0, s);
    CHECK((g+0)->items[0] == 0 && (g+0)->items[3] == 0, "-1 slots must be dropped outside sandbox");

    strcpy(s, "1,500,-7,3");
    setSlots(0, s);
    CHECK((g+0)->items[0] == 1 && (g+0)->items[1] == 0 && (g+0)->items[2] == 0 && (g+0)->items[3] == 3,
        "out of range ids must be dropped: %d %d %d %d", (g+0)->items[0], (g+0)->items[1], (g+0)->items[2], (g+0)->items[3]);

    sandbox = 1;
    strcpy(s, "-1");
    setSlots(0, s);
    CHECK((g+0)->items[0] == -1 && (g+0)->items[1] == 0 && (g+0)->items[3] == 0, "sandbox keeps -1, short list must not overread");
    (g+0)->lvl = 1;
    CHECK(isItemReady(0, "pot-hp-5") == 1, "-1 counts as any item in sandbox");

    sandbox = 0;
    CHECK(isItemReady(0, "pot-hp-5") == 0, "-1 must not count as any item outside sandbox");
}

void testJsonEscape(){
    char out[200];
    jsonEscape("a\"b\\c\nd", out, sizeof(out));
    CHECK(strcmp(out, "a\\\"b\\\\c\\u000ad") == 0, "escape quotes, backslash, newline: %s", out);
    jsonEscape("ol\xc3", out, sizeof(out));
    CHECK(strcmp(out, "ol") == 0, "a cut multibyte character must be dropped: %s", out);
    jsonEscape("a\xc3\xa7\xc3\xa3o", out, sizeof(out));
    CHECK(strcmp(out, "a\xc3\xa7\xc3\xa3o") == 0, "valid UTF-8 must pass through: %s", out);
    jsonEscape("\"\"\"\"\"\"\"\"\"\"", out, 8);
    CHECK(strlen(out) < 8, "output must respect its size: %s", out);
}

void testAttrPotion(){
    resetArena(1);
    CHECK(itemEffect(0, "pot-high-1") == 1, "pot-high-1 applies");
    //every derived stat must still match the attribute it comes from (same formulas as setSTR/AGI/INT)
    CHECK(NEAR((g+0)->maxhp, 100 + 10 * (g+0)->STR), "maxhp %f for STR %d", (g+0)->maxhp, (g+0)->STR);
    CHECK(NEAR((g+0)->mdmg, 5 + 0.75 * (g+0)->STR), "mdmg %f for STR %d", (g+0)->mdmg, (g+0)->STR);
    CHECK(NEAR((g+0)->spd, 1 + 0.05 * (g+0)->AGI), "spd %f for AGI %d", (g+0)->spd, (g+0)->AGI);
    CHECK(NEAR((g+0)->ts, 90 + 9 * (g+0)->AGI), "ts %f for AGI %d", (g+0)->ts, (g+0)->AGI);
    CHECK(NEAR((g+0)->maxap, 100 + 10 * (g+0)->INT), "maxap %f for INT %d", (g+0)->maxap, (g+0)->INT);
    CHECK((g+0)->STR + (g+0)->AGI + (g+0)->INT == 35, "pot-high-1 at lvl 1 adds one point");
}

void testCloseEnemy(){
    resetArena(3);
    //both enemies ahead (north is -y); 3.9 and 3.2 away truncate to the same int
    (g+1)->y = 12.5 - 3.9;
    (g+2)->y = 12.5 - 3.2;
    (g+2)->x = 12.6;
    CHECK(getCloseEnemy(0) == 1 && (g+0)->targetlocked == (g+2)->port, "closest enemy should be glad 2");
    CHECK(getFarEnemy(0) == 1 && (g+0)->targetlocked == (g+1)->port, "farthest enemy should be glad 1");
}

int main(){
    pthread_mutex_init(&lock, NULL);
    pthread_cond_init(&cond, NULL);
    setItemNames();
    outArq = NULL;
    simlogclosed = 1; //no simlog in unit tests

    testCalcCost();
    testExplodeItemName();
    testBlockSeam();
    testResistClamp();
    testSetSlots();
    testJsonEscape();
    testAttrPotion();
    testCloseEnemy();

    if (failures == 0)
        printf("all engine tests passed\n");
    return failures ? 1 : 0;
}
