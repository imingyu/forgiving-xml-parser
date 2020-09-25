const { parse, parseResultToJSON } = require('./src/index');
const res = parse(`<view class="nav" style="padding-top: {{statusBarHeight}}rpx; height: {{navbarHeight}}rpx">
<view class="hot-button {{index == KEEP_navIndex? 'active': ''}}" catchtap="navChange" wx:for="{{navList}}" wx:key="index" data-index="{{index}}" />
</view>`);
console.log(JSON.stringify(parseResultToJSON(res, {
    locationInfo: true
})));