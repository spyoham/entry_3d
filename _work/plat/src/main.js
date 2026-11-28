// 함수 밖 코드는 이것뿐이다
on('start', '붓', function () {
    게임_준비();
    for (;;) {
        한_프레임();
    }
});
on('start', '안내', function () {
    for (;;) {
        안내글_보여주기();
    }
});
