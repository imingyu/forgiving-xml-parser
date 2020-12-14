!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).ForgivingXmlParser={})}(this,function(h){"use strict";var e,t,r,n,o,a,s,l,u,v={code:1,message:"边界符附近存在空白字符"},F={code:2,message:"标签名称中含有多个边界符“<”"},C={code:3,message:"标签名称为空"},i={code:4,message:"标签未闭合"},A={code:5,message:"属性名称为空"},S={code:6,message:"属性值中包含换行符"},b={code:7,message:"属性中含有多个“=“"},w={code:12,message:"标签“=”附近存在空白字符"},p={code:13,message:"标签名称附近存在空白字符"},c={code:14,message:"无法找到与之匹配的开始标签"};(e=h.FxNodeType||(h.FxNodeType={})).comment="comment",e.element="element",e.text="text",e.attr="attr",e.cdata="cdata",e.processingInstruction="processingInstruction",e.dtd="dtd",e.custom="custom",(t=h.FxParseAttrTarget||(h.FxParseAttrTarget={})).name="name",t.equal="equal",t.leftBoundary="leftBoundary",t.content="content",(r=h.FxEventType||(h.FxEventType={})).nodeStart="nodeStart",r.nodeEnd="nodeEnd",r.nodeNameStart="nodeNameStart",r.nodeNameEnd="nodeNameEnd",r.startTagStart="startTagStart",r.startTagEnd="startTagEnd",r.endTagStart="endTagStart",r.endTagEnd="endTagEnd",r.attrsStart="attrsStart",r.attrsEnd="attrsEnd",r.attrEqual="attrEqual",r.attrLeftBoundary="attrLeftBoundary",r.attrRightBoundary="attrRightBoundary",r.nodeContentStart="nodeContentStart",r.nodeContentEnd="nodeContentEnd",r.error="error",r.warn="warn",(n=h.AttrMoreEqualDisposal||(h.AttrMoreEqualDisposal={})).throwError="throwError",n.merge="merge",n.newAttr="newAttr",(o=h.StartTagMoreLeftBoundaryCharDisposal||(h.StartTagMoreLeftBoundaryCharDisposal={})).throwError="throwError",o.ignore="ignore",o.accumulationToName="accumulationToName",o.newNode="newNode",o.childNode="childNode",(a=h.FxTagType||(h.FxTagType={})).startTag="startTag",a.endTag="endTag",(s=h.FxNodeNature||(h.FxNodeNature={})).alone="alone",s.children="children",(l=h.FxNodeParserAllowNodeNotCloseOption||(h.FxNodeParserAllowNodeNotCloseOption={})).allow="allow",l.notAllow="notAllow",l.followParserOptions="followParserOptions",(u=h.FxNodeCloseType||(h.FxNodeCloseType={})).notClosed="notClosed",u.fullClosed="fullClosed",u.selfCloseing="selfCloseing",u.startTagClosed="startTagClosed";var d="<![CDATA[",f="]]>",T="\x3c!--",N="--\x3e",P=/\s/,O={allowAttrContentHasBr:!0,allowNodeNameEmpty:!0,allowNodeNotClose:!0,allowStartTagBoundaryNearSpace:!0,allowEndTagBoundaryNearSpace:!0,allowTagNameHasSpace:!0,allowNearAttrEqualSpace:!0,ignoreTagNameCaseEqual:!0,encounterAttrMoreEqual:h.AttrMoreEqualDisposal.merge};function y(e){return(y="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}var B=function(){return(B=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++)for(var o in t=arguments[r])Object.prototype.hasOwnProperty.call(t,o)&&(e[o]=t[o]);return e}).apply(this,arguments)};function E(){for(var e=0,t=0,r=arguments.length;t<r;t++)e+=arguments[t].length;for(var n=Array(e),o=0,t=0;t<r;t++)for(var a=arguments[t],s=0,l=a.length;s<l;s++,o++)n[o]=a[s];return n}function _(e,t){var r=new Error(e.message);return r.code=e.code,Object.assign(r,t),r}function m(e,t){return V(e,K(t),"<","/")}function x(e){return"function"==typeof e||e instanceof Function}function M(e,t,r,n){return e.push(X(t,r,n)),e}function R(e,t,r,n){return t&&(e.lineNumber+=t),r&&(e.column+=r,e.column<0&&(e.column=Math.abs(e.column))),n&&(e.offset+=n),e}function g(e,t,r,n){n&&n[e]&&(t[e]=r[e])}function q(e,t){var r,n={};for(r in e)"parent"!==r&&"parser"!==r&&("steps"===r?t&&t.steps&&(n[r]=e[r].map(function(e){var t,r,n,o,a,s,l=B({},e);return Array.isArray(l.data)?(o=(t=l.data)[0],r=t[1],n=t[2],"object"===y(o)&&(s=o,n=n||s.nodeCustomType,o=s.nodeType),(a=[o,r,n])[2]||a.splice(2,1),l.data=a):"object"===y(l.data)&&(s=l.data,l.data=[s.nodeType,h.FxNodeCloseType.fullClosed,s.nodeCustomType],l.data[2]||l.data.splice(2,1)),l})):"closeType"===r?e[r]&&e[r]!==h.FxNodeCloseType.fullClosed&&(n[r]=e[r]):"locationInfo"!==r?n[r]="attrs"===r||"children"===r?e[r].map(function(e){return q(e,t)}):e[r]:t&&t.locationInfo&&(n[r]=JSON.parse(JSON.stringify(e[r]))));return n}function L(e){var t=JSON.parse(JSON.stringify(e));return t.message=e.message,t.stack=e.stack,t}function j(e,t){return"\n"===e[t]?0:"\r"===e[t]&&"\n"===e[t+1]?1:-1}function k(e,t){var r="";if(!e||!t)return r;for(;t--;)r+=e;return r}function D(e,t){return e.lineNumber===t.lineNumber&&e.column===t.column&&e.offset===t.offset}function I(e,t){for(var r=e.length,n=B({},t);n.offset<r;R(n,0,1,1)){var o=e[n.offset];if(!P.test(o))return n;var a=j(e,n.offset);-1!==a&&R(n,1,-n.column,a?1:0)}}function z(e,t,r){for(var n=e.length,o=B({},t);o.offset<n;R(o,0,1,1)){var a=e[o.offset];if(!P.test(a))return a===r?o:void 0;var s=j(e,o.offset);-1!==s&&R(o,1,-o.column,s?1:0)}}function H(r,n,o){return o.nodeAdapters.find(function(e){var t=y(e.parseMatch);return"string"===t?r.substr(n.offset,e.parseMatch.length)===e.parseMatch:"function"===t?e.parseMatch(r,n,o):e.parseMatch instanceof RegExp?e.parseMatch.test(r.substr(n.offset)):void 0})}function G(t,r,n,o,a){return o.nodeAdapters.find(function(e){return e.serializeMatch(t,r,n,o,a)})}function J(e,t,r){var n=0,o=t.currentNode;if(r(o,t,e))return n;if(o.parent)for(;o=o.parent;)if(n++,r(o,t,e))return n;return-1}function U(e,t){e.maxLineNumber<t.lineNumber&&(e.maxLineNumber=t.lineNumber),e.maxColumn<t.column&&(e.maxColumn=t.column)}function Y(e){var t=e.data;return{type:t.nodeType,parser:t,locationInfo:{startLineNumber:e.cursor.lineNumber,startColumn:e.cursor.column,startOffset:e.cursor.offset},steps:[]}}function Q(e,t,r){var n=r?e[r]:e;n.endLineNumber=t.lineNumber,n.endColumn=t.column,n.endOffset=t.offset}function W(e,t,r){var n;t||(n=!0,t={});for(var o=[],a=0,s=e.length;a<s;a++){var l,u,d=e[a],f=d.step,i=d.cursor,c=d.data;if(f===h.FxEventType.nodeStart?(l=c.nodeType,u=Y(d),U(t,d.cursor),u.steps.push(d),t.currentNode?(u.parent=t.currentNode,l===h.FxNodeType.attr?(t.currentNode.attrs||(t.currentNode.attrs=[]),t.currentNode.attrs.push(u),t.currentNode.locationInfo.attrs||(t.currentNode.locationInfo.attrs=[]),t.currentNode.locationInfo.attrs.push(u.locationInfo)):(t.currentNode.children||(t.currentNode.children=[]),t.currentNode.children.push(u))):(o.push(u),t.nodes&&t.nodes.push(u)),t.currentNode=u):f===h.FxEventType.startTagStart?t.currentNode&&(t.currentNode.steps.push(d),t.currentNode.locationInfo.startTag={startLineNumber:i.lineNumber,startColumn:i.column,startOffset:i.offset}):f===h.FxEventType.nodeNameEnd?t.currentNode&&(t.currentNode.steps.push(d),t.currentNode.name=c):f===h.FxEventType.attrEqual?t.currentNode&&(t.currentNode.steps.push(d),t.currentNode.equalCount||(t.currentNode.equalCount=0),t.currentNode.equalCount++):f===h.FxEventType.attrLeftBoundary?c&&t.currentNode&&(t.currentNode.steps.push(d),t.currentNode.boundaryChar=[c]):f===h.FxEventType.attrRightBoundary?c&&t.currentNode&&(t.currentNode.steps.push(d),t.currentNode.boundaryChar.push(c)):f===h.FxEventType.startTagEnd?t.currentNode&&(Array.isArray(c)&&c[1]in h.FxNodeCloseType&&(t.currentNode.closeType=c[1]),t.currentNode.steps.push(d),Q(t.currentNode.locationInfo,i,"startTag")):f===h.FxEventType.nodeContentEnd?c&&t.currentNode&&(t.currentNode.steps.push(d),t.currentNode.content=c):f===h.FxEventType.endTagStart?t.currentNode&&(t.currentNode.steps.push(d),t.currentNode.locationInfo.endTag={startLineNumber:i.lineNumber,startColumn:i.column,startOffset:i.offset}):f===h.FxEventType.endTagEnd?t.currentNode&&(t.currentNode.steps.push(d),Q(t.currentNode.locationInfo,i,"endTag")):f===h.FxEventType.nodeEnd?(U(t,i),t.currentNode&&(Q(t.currentNode.locationInfo,i),Array.isArray(c)&&c[1]&&c[1]in h.FxNodeCloseType&&(t.currentNode.closeType===h.FxNodeCloseType.startTagClosed&&c[1]===h.FxNodeCloseType.notClosed||(t.currentNode.closeType=c[1])),t.currentNode.steps.push(d),t.currentNode.parent?t.currentNode=t.currentNode.parent:delete t.currentNode)):t.currentNode&&t.currentNode.steps.push(d),!n){if(Object.assign(t,i),f===h.FxEventType.error)throw Z(f,t,c),c;Z(f,t,t.currentNode)}if(a===s-1&&U(t,i),r&&r(d,a))break}return o}var X=function(e,t,r){var n;r&&r.code&&r.message&&!r.stack&&(n=_(r,t));var o={step:e,cursor:B({},t)};return void 0!==r&&(o.data=n||r),o},K=function(e){return{lineNumber:e.lineNumber,column:e.column,offset:e.offset}},V=function(e,t,r,n){if(e[t.offset]===r){var o=B({},t);if(R(o,0,1,1),o=z(e,o,n))return o}},Z=function(e,t,r){t.options&&"function"==typeof t.options.onEvent&&t.options.onEvent(e,t,r)};function $(e,t,r,n){for(var o=[],a=4;a<arguments.length;a++)o[a-4]=arguments[a];return e&&t in e?x(e[t])?e[t].apply(null,o):e[t]instanceof RegExp?e[t].test(n):!!e[t]:r instanceof RegExp?r.test(n):!!r}function ee(e,t,r){for(var n=[],o=3;o<arguments.length;o++)n[o-3]=arguments[o];return e&&t in e?x(e[t])?e[t].apply(null,n):e[t]:r}function te(e,t,r){return r.allowNodeNotClose===h.FxNodeParserAllowNodeNotCloseOption.allow||r.allowNodeNotClose!==h.FxNodeParserAllowNodeNotCloseOption.notAllow&&("function"==typeof r.allowNodeNotClose?r.allowNodeNotClose(e,t,r):!(!t.options||!t.options.allowNodeNotClose)&&(t.options.allowNodeNotClose instanceof RegExp?t.options.allowNodeNotClose.test(e.name):"function"==typeof t.options.allowNodeNotClose?t.options.allowNodeNotClose(e,t,r):!!t.options.allowNodeNotClose))}function re(e,t,r,n){var o=[],a=e.length,s=n&&n.type===h.FxNodeType.element&&"script"===n.name;o.push({step:h.FxEventType.nodeStart,cursor:B({},t),data:Ne}),o.push({step:h.FxEventType.nodeContentStart,cursor:B({},t)});for(var l="";t.offset<a;R(t,0,1,1)){l+=e[t.offset];var u=j(e,t.offset);-1!==u&&R(t,1,-t.column,u?1:0);var d={lineNumber:t.lineNumber,offset:t.offset+1,column:t.column+1},f=void 0;if(f=s?m(e,d)&&/^<\s*\/\s*script/.test(e.substr(d.offset)):!!H(e,d,r),t.offset>=a-1||f){o.push({step:h.FxEventType.nodeContentEnd,cursor:B({},t),data:l}),o.push({step:h.FxEventType.nodeEnd,cursor:B({},t),data:[Ne,h.FxNodeCloseType.fullClosed]});break}}return o}function ne(e,t,r,n,o,a){var s=[],l=e.length;M(s,h.FxEventType.nodeStart,r,a),M(s,h.FxEventType.startTagStart,r),R(r,0,n.length-1,n.length-1),M(s,h.FxEventType.startTagEnd,r,[a,h.FxNodeCloseType.startTagClosed]),R(r,0,1,1),M(s,h.FxEventType.nodeContentStart,r);for(var u="";r.offset<l;R(r,0,1,1)){var d=e[r.offset];if(e[r.offset+1]===o[0]&&e.substr(r.offset+1,o.length)===o){u+=d,M(s,h.FxEventType.nodeContentEnd,r,u),R(r,0,1,1),M(s,h.FxEventType.endTagStart,r),R(r,0,o.length-1,o.length-1),M(s,h.FxEventType.endTagEnd,r),M(s,h.FxEventType.nodeEnd,r,[a,h.FxNodeCloseType.fullClosed]),R(r,0,1,1);break}u+=d;var f=j(e,r.offset);-1!=f&&R(r,1,-r.column,f?1:0)}return s}function oe(e,t,r,n){var o=ne(e.xml,e.options,{lineNumber:e.lineNumber,column:e.column,offset:e.offset},t,r,n);W(o,e)}function ae(e,t,r,n,o){for(var a=[],s=e.length;t.offset<s;R(t,0,1,1)){var l=[],u=me(e,t,r,n,l),a=a.concat(l);if("break"===u||o&&o(l,a))return a}return a}function se(e,t,r){var n,o,a=e.substr(r.offset);return t instanceof RegExp?(o=a.match(t))&&(n=o[0]):n=a.substr(0,(t||"").length),n}function le(r,n,o){var a=[],e=r.length;M(a,h.FxEventType.nodeStart,n,ge),M(a,h.FxEventType.startTagStart,n),R(n,0,1,1);for(var s=X(h.FxEventType.nodeNameStart,n),l="",t=function(e){l||$(o,"allowNodeNameEmpty",O.allowNodeNameEmpty,l,r,s.cursor,ge)||M(a,h.FxEventType.error,s.cursor,C);var t="/"===r[n.offset];Object.assign(n,e),M(a,h.FxEventType.startTagEnd,n),t&&M(a,h.FxEventType.nodeEnd,n,[ge,h.FxNodeCloseType.selfCloseing])};n.offset<e;R(n,0,1,1)){var u=r[n.offset];if("<"===u)return M(a,h.FxEventType.error,n,F);if(P.test(u)){var d=!0,f=X(h.FxEventType.attrsStart,n);-1!=(p=j(r,n.offset))?R(n,1,1-n.column,p?1:0):R(n,0,1,1);break}if(P.test(r[n.offset+1])){l+=u,a.push(s),M(a,h.FxEventType.nodeNameEnd,n,l),d=!0,R(n,0,1,1),M(a,h.FxEventType.attrsStart,n),-1!=(p=j(r,n.offset))&&R(n,1,1-n.column,p?1:0);break}if(c=ge.checkAttrsEnd(r,n,o)){t(c);break}var i=R(B({},n),0,1,1);if(c=ge.checkAttrsEnd(r,i,o)){l+=u,a.push(s),M(a,h.FxEventType.nodeNameEnd,n,l),R(n,0,1,1),t(c);break}l+=u}if(d){var c,p,T=ae(r,n,ge,o);if(!l){var N,y=W(T,null,function(e,t){return N=t,e.step===h.FxEventType.nodeEnd||e.step===h.FxEventType.startTagEnd});if(!y[0]||y[0].equalCount||y[0].content){if(!$(o,"allowNodeNameEmpty",O.allowNodeNameEmpty,null,r,s.cursor,ge))return M(a,h.FxEventType.error,s.cursor,C)}else{var E=y[0].name;if(!$(o,"allowStartTagBoundaryNearSpace",O.allowStartTagBoundaryNearSpace,E,r,s.cursor,ge,E))return M(a,h.FxEventType.error,s.cursor,v);var m=T.splice(0,N+1),x=m.find(function(e){return e.step===h.FxEventType.nodeNameStart}),g=m[m.length-1];g.data=E,Object.assign(s.cursor,x.cursor),a.push(s,g),Object.assign(f.cursor,{lineNumber:g.cursor.lineNumber,offset:g.cursor.offset+1,column:g.cursor.column+1}),a.push(f)}}if(a=a.concat(T),M(a,h.FxEventType.attrsEnd,n),n.offset<e-1)for(;n.offset<e;R(n,0,1,1)){if(c=ge.checkAttrsEnd(r,n,o)){t(c),R(n,0,1,1);break}-1!=(p=j(r,n.offset))&&R(n,1,1-n.column,p?1:0)}}return a}function ue(e,t,r,n){var o=[],a=e.length;n=n||V(e,t,"<","/"),M(o,h.FxEventType.endTagStart,t);var s,l={lineNumber:t.lineNumber,column:t.column+1,offset:t.offset+1};if(!D(l,n)&&!$(r,"allowEndTagBoundaryNearSpace",O.allowEndTagBoundaryNearSpace,null,e,l,ge))return M(o,h.FxEventType.error,t,v);Object.assign(t,n),R(t,0,1,1);for(var u,d="";t.offset<a;R(t,0,1,1)){var f=e[t.offset];if(P.test(f)){if(!$(r,"allowEndTagBoundaryNearSpace",O.allowEndTagBoundaryNearSpace,d,e,t,ge,d))return M(o,h.FxEventType.error,t,p);var i=j(e,t.offset);-1!=i&&R(t,1,-t.column,i?1:0),d&&(d+=f)}else{if(d+=f,">"===e[t.offset+1]){var c=R(B({},t),0,1,1);if(c){d=d.trim(),Object.assign(t,c),u={step:h.FxEventType.endTagEnd,cursor:B({},t),data:d},s=!0;break}}}}return s&&(o.push(u),M(o,h.FxEventType.nodeEnd,t,[ge,h.FxNodeCloseType.fullClosed])),o}function de(e,t,r){M(i=[],h.FxEventType.nodeStart,t,ve),M(i,h.FxEventType.startTagStart,t);var n=V(e,t,"<","?"),o=R(K(t),0,1,1),a=K(n);R(a,0,1,1);var s=ae(e,a,ve,r,function(e){return!0}),l="",u=W(s,null);if(!u[0]||u[0].equalCount||u[0].content||(l=u[0].name),!D(n,o)&&!$(r,"allowStartTagBoundaryNearSpace",O.allowStartTagBoundaryNearSpace,l,e,o,ve,l))return M(i,h.FxEventType.error,o,v);if(Object.assign(t,n),R(t,0,1,1),l){var d=e.substring(t.offset,a.offset+1);if(d!==l){if(!$(r,"allowTagNameHasSpace",O.allowTagNameHasSpace,l,e,t,ve,d,h.FxTagType.startTag))return M(i,h.FxEventType.error,t,v);M(i,h.FxEventType.nodeNameStart,t),M(i,h.FxEventType.nodeNameEnd,a,d)}else M(i,h.FxEventType.nodeNameStart,s[0].cursor),M(i,h.FxEventType.nodeNameEnd,a,l);Object.assign(t,a),R(t,0,1,1)}else if(!$(r,"allowNodeNameEmpty",O.allowNodeNameEmpty,null,e,n,ve))return M(i,h.FxEventType.error,n,C);M(i,h.FxEventType.attrsStart,t);var f=ae(e,t,ve,r),i=i.concat(f);M(i,h.FxEventType.attrsEnd,t);var c=e.length;if(t.offset<c-1)for(;t.offset<c;R(t,0,1,1)){var p=e[t.offset];if("?"!==p){if(">"===p){M(i,h.FxEventType.endTagEnd,t),M(i,h.FxEventType.nodeEnd,t,[ve,h.FxNodeCloseType.fullClosed]),R(t,0,1,1);break}var T=j(e,t.offset);-1!=T&&R(t,1,1-t.column,T?1:0)}else M(i,h.FxEventType.endTagStart,t)}return i}function fe(e,t,r){M(i=[],h.FxEventType.nodeStart,t,Fe),M(i,h.FxEventType.startTagStart,t);var n=V(e,t,"<","!"),o=R(K(t),0,1,1),a=K(n);R(a,0,1,1);var s=ae(e,a,Fe,r,function(e){return!0}),l="",u=W(s,null);if(!u[0]||u[0].equalCount||u[0].content||(l=u[0].name),!D(n,o)&&!$(r,"allowStartTagBoundaryNearSpace",O.allowStartTagBoundaryNearSpace,l,e,o,Fe,l))return M(i,h.FxEventType.error,o,v);if(Object.assign(t,n),R(t,0,1,1),l){var d=e.substring(t.offset,a.offset+1);if(d!==l){if(!$(r,"allowTagNameHasSpace",O.allowTagNameHasSpace,l,e,t,Fe,d,h.FxTagType.startTag))return M(i,h.FxEventType.error,t,v);M(i,h.FxEventType.nodeNameStart,t),M(i,h.FxEventType.nodeNameEnd,a,d)}else M(i,h.FxEventType.nodeNameStart,s[0].cursor),M(i,h.FxEventType.nodeNameEnd,a,l);Object.assign(t,a),R(t,0,1,1)}else if(!$(r,"allowNodeNameEmpty",O.allowNodeNameEmpty,null,e,n,Fe))return M(i,h.FxEventType.error,n,C);M(i,h.FxEventType.attrsStart,t);var f=ae(e,t,Fe,r),i=i.concat(f);M(i,h.FxEventType.attrsEnd,t);var c=e.length;if(t.offset<c-1)for(;t.offset<c;R(t,0,1,1)){var p=Fe.checkAttrsEnd(e,t,r);if(p){Object.assign(t,p),M(i,h.FxEventType.startTagEnd,t),">"===e[t.offset]&&M(i,h.FxEventType.nodeEnd,t,Fe),R(t,0,1,1);break}var T=j(e,t.offset);-1!=T&&R(t,1,1-t.column,T?1:0)}return i}function ie(e,t,r,n){var o=[];n=n||V(e,t,"]",">"),M(o,h.FxEventType.endTagStart,t);var a={lineNumber:t.lineNumber,column:t.column+1,offset:t.offset+1};return D(a,n)||$(r,"allowEndTagBoundaryNearSpace",O.allowEndTagBoundaryNearSpace,null,e,a,Fe)?(Object.assign(t,n),M(o,h.FxEventType.endTagEnd,t),M(o,h.FxEventType.nodeEnd,t,Fe),o):M(o,h.FxEventType.error,t,v)}function ce(t,e){e=Object.assign({},O,"object"===y(e)&&e?e:{});var r={offset:0,xmlLength:t.length,xml:t,maxLineNumber:0,maxColumn:0,lineNumber:1,column:1,nodes:[],options:e};try{for(;r.offset<r.xmlLength;R(r,0,1,1)){var n=H(r.xml,{lineNumber:r.lineNumber,column:r.column,offset:r.offset},r.options);n?n.parse(r):Ne.parse(r)}return{xml:t,maxLine:r.maxLineNumber,maxCol:r.maxColumn,nodes:r.nodes}}catch(e){return{error:e,xml:t}}}function pe(e,t){var r={};return e.error&&(r.error=L(e.error)),e.warnings&&(r.warnings=e.warnings.map(L)),g("maxLine",r,e,t),g("maxCol",r,e,t),g("xml",r,e,t),e.error||(r.nodes=e.nodes.map(function(e){return q(e,t)})),r}function Te(e,t){if(e&&"object"===y(e)){Array.isArray(e)||(e=[e]),t=Object.assign({nodeAdapters:O.nodeAdapters},"object"===y(t)&&t?t:{});var l=e;return function r(n,o,a){var s="";return n.forEach(function(e){var t=G(e,n,l,o,a);s+=(t=t||Ne).serialize(e,n,l,r,o,a)}),s}(e,t)}}var Ne={nodeNature:h.FxNodeNature.alone,nodeType:h.FxNodeType.text,parseMatch:function(){return!0},parse:function(e){var t=re(e.xml,{lineNumber:e.lineNumber,column:e.column,offset:e.offset},e.options,e.currentNode);W(t,e)},serializeMatch:function(){return!0},serialize:function(e){return e.content||""}},ye={nodeType:h.FxNodeType.cdata,nodeNature:h.FxNodeNature.alone,parseMatch:d,parse:function(e){oe(e,d,f,ye)},serializeMatch:function(e){return e.type===h.FxNodeType.cdata},serialize:function(e){return d+(e.content||"")+(e.closeType&&e.closeType!==h.FxNodeCloseType.fullClosed?"":f)}},Ee={nodeType:h.FxNodeType.comment,nodeNature:h.FxNodeNature.alone,parseMatch:T,parse:function(e){oe(e,T,N,Ee)},serializeMatch:function(e){return e.type===h.FxNodeType.comment},serialize:function(e){return T+(e.content||"")+(e.closeType&&e.closeType!==h.FxNodeCloseType.fullClosed?"":N)}},me=function(n,o,a,s,l){for(var u,d,f,e,t,r=n.length,i="",c=function(){i=u=d=void 0},p=function(e){if(!u)return u=e,void(d===h.FxParseAttrTarget.name?M(l,h.FxEventType.nodeNameStart,o,h.FxNodeType.attr):d===h.FxParseAttrTarget.content&&M(l,h.FxEventType.nodeContentStart,o));u+=e},T=function(e){void 0===e&&(e=!1),e&&d&&(d===h.FxParseAttrTarget.name?M(l,h.FxEventType.nodeNameEnd,o,u):d===h.FxParseAttrTarget.content&&M(l,h.FxEventType.nodeContentEnd,o,u)),M(l,h.FxEventType.nodeEnd,o,[xe,d===h.FxParseAttrTarget.name||d===h.FxParseAttrTarget.content?h.FxNodeCloseType.fullClosed:h.FxNodeCloseType.notClosed]),c()},N=function(){var e=R(B({},o),0,1,1),t=I(n,e);if(!t)return T(!0),f=!0;if(d===h.FxParseAttrTarget.name){if("="!==n[t.offset])return function(e,t,r){if(!r)return!1;var n=e.substr(t.offset);return r instanceof RegExp?r.test(e):(r=r||"",n.substr(0,r.length)===r)}(n,t,a.attrLeftBoundaryChar)?(T(!0),!0):a.checkAttrsEnd(n,t,s)?(T(!0),f=!0):!!P.test(n[e.offset])&&(T(!0),!0);if(!D(e,t)&&!$(s,"allowNearAttrEqualSpace",O.allowNearAttrEqualSpace,null,n,e,xe))throw _(w,e);return M(l,h.FxEventType.nodeNameEnd,o,u),u=void 0,d=h.FxParseAttrTarget.equal,!1}if(d===h.FxParseAttrTarget.leftBoundary&&"="===n[t.offset])return ee(s,"encounterAttrMoreEqual",O.encounterAttrMoreEqual,n,t,xe)===h.AttrMoreEqualDisposal.newAttr&&(T(),!0);if(d===h.FxParseAttrTarget.content)if(i){var r=se(n,a.attrRightBoundaryChar,t);!r||a.attrBoundaryCharNeedEqual&&i!==r||M(l,h.FxEventType.nodeContentEnd,o,u)}else if(f=!!a.checkAttrsEnd(n,t,s),P.test(n[e.offset])||f)return T(!0),!0},y=function(){return f?"break":""},E=function(){var e=R(B({},o),0,1,1);if(P.test(n[e.offset])&&!$(s,"allowNearAttrEqualSpace",O.allowNearAttrEqualSpace,null,n,e,xe))throw _(w,e)};o.offset<r;R(o,0,1,1)){var m=n[o.offset];if(P.test(m)){if(i&&d===h.FxParseAttrTarget.content){p(m);var x=j(n,o.offset);if(-1!==x){if(d===h.FxParseAttrTarget.content){if(e="allowAttrContentHasBr",!(t=s)||!t[e])throw _(S,o);p(x?m+n[o.offset+1]:m)}R(o,1,-o.column,x?1:0);continue}if(N())return y();continue}var g=j(n,o.offset);-1!==g&&R(o,1,-o.column,g?1:0)}else if("="!==m){var v=d===h.FxParseAttrTarget.content?a.attrRightBoundaryChar:a.attrLeftBoundaryChar,F=se(n,v,o);if(F){if(!d){if(!$(s,"allowNodeNameEmpty",O.allowNodeNameEmpty,null,n,o,xe))throw _(A,o);if(M(l,h.FxEventType.nodeStart,o,xe),i=F,M(l,h.FxEventType.attrLeftBoundary,o,F),R(o,0,F.length-1,F.length-1),u="",d=h.FxParseAttrTarget.content,N())return y();continue}if(d===h.FxParseAttrTarget.leftBoundary){if(d=h.FxParseAttrTarget.content,u="",i=F,M(l,h.FxEventType.attrLeftBoundary,o,F),R(o,0,F.length-1,F.length-1),N())return y();continue}if(d===h.FxParseAttrTarget.content&&(!a.attrBoundaryCharNeedEqual||i===F))return M(l,h.FxEventType.attrRightBoundary,o,F),R(o,0,F.length-1,F.length-1),M(l,h.FxEventType.nodeEnd,o,[xe,h.FxNodeCloseType.fullClosed]),c(),N(),y();R(o,0,F.length-1,F.length-1),p(F)}else if(d!==h.FxParseAttrTarget.name&&d!==h.FxParseAttrTarget.content){if(d!==h.FxParseAttrTarget.leftBoundary){if(!d){if(a.checkAttrsEnd(n,o,s))return f=!0,y();if(d=h.FxParseAttrTarget.name,M(l,h.FxEventType.nodeStart,o,xe),p(m),N())return y()}}else if(d=h.FxParseAttrTarget.content,p(m),N())return y()}else if(p(m),N())return y()}else{if(!d){if(!$(s,"allowNodeNameEmpty",O.allowNodeNameEmpty,null,n,o,xe))throw _(A,o);if(M(l,h.FxEventType.nodeStart,o,xe),M(l,h.FxEventType.attrEqual,o),d=h.FxParseAttrTarget.leftBoundary,E(),N())return y();continue}if(d===h.FxParseAttrTarget.equal){if(M(l,h.FxEventType.attrEqual,o),d=h.FxParseAttrTarget.leftBoundary,E(),N())return y();continue}if(d===h.FxParseAttrTarget.leftBoundary){if(ee(s,"encounterAttrMoreEqual",O.encounterAttrMoreEqual,n,o,xe)===h.AttrMoreEqualDisposal.throwError)throw _(b,o);if(M(l,h.FxEventType.attrEqual,o),E(),N())return y();continue}if(d===h.FxParseAttrTarget.content&&i){if(p(m),N())return y();continue}}}if(!f&&d&&(d===h.FxParseAttrTarget.name?(M(l,h.FxEventType.nodeNameEnd,o,u),M(l,h.FxEventType.nodeEnd,o,[xe,h.FxNodeCloseType.fullClosed])):d===h.FxParseAttrTarget.equal?M(l,h.FxEventType.nodeEnd,l[l.length-1].cursor,[xe,h.FxNodeCloseType.fullClosed]):d===h.FxParseAttrTarget.leftBoundary?M(l,h.FxEventType.nodeEnd,o,[xe,h.FxNodeCloseType.notClosed]):d===h.FxParseAttrTarget.content&&(M(l,h.FxEventType.nodeContentEnd,o,u),M(l,h.FxEventType.nodeEnd,l[l.length-1].cursor,[xe,i?h.FxNodeCloseType.notClosed:h.FxNodeCloseType.fullClosed])),f=!0),f)return"break"},xe={nodeNature:h.FxNodeNature.alone,nodeType:h.FxNodeType.attr,parseMatch:"",parse:function(e,t){var r=ae(e.xml,e,t,e.options);W(r,e)},serializeMatch:function(e){return e.type===h.FxNodeType.attr},serialize:function(e){var t=Array.isArray(e.boundaryChar)?e.boundaryChar:[e.boundaryChar||"",e.boundaryChar||""],r=t[0],n=(n=t[1])||r;return""+(e.name||"")+k("=",e.equalCount)+r+(e.content||"")+(e.closeType&&e.closeType!==h.FxNodeCloseType.fullClosed?"":n)}},ge={nodeNature:h.FxNodeNature.children,nodeType:h.FxNodeType.element,attrLeftBoundaryChar:/^'|^"/,attrRightBoundaryChar:/^'|^"/,attrBoundaryCharNeedEqual:!0,allowNodeNotClose:h.FxNodeParserAllowNodeNotCloseOption.followParserOptions,parseMatch:/^<\s*\/|^</,checkAttrsEnd:function(e,t){var r=e[t.offset];if(">"===r)return t;if("/"===r){var n=R(B({},t),0,1,1);return z(e,n,">")}},parse:function(o){var e=m(o.xml,o);if(e){if((r=ue(o.xml,{lineNumber:o.lineNumber,column:o.column,offset:o.offset},o.options,e))[r.length-1].step!==h.FxEventType.error){var a=r.find(function(e){return e.step===h.FxEventType.endTagEnd}).data,t=J(r,o,function(e){return t=a,n=o,(r=e).name===t||!((r.name||"").toLowerCase()!==(t||"").toLowerCase()||!$(n.options,"ignoreTagNameCaseEqual",O.ignoreTagNameCaseEqual,r.name,t,r,n));var t,r,n});if(-1===t){var r,n=r[0].cursor;M(r=[],h.FxEventType.error,n,c)}else if(0<t)for(var s=r[0],l=void 0,u=0;u<=t;u++){var d=(l=l?l.parent:o.currentNode).children?l.children[l.children.length-1].steps[l.children[l.children.length-1].steps.length-1]:l.steps[l.steps.length-1],f=l.steps[0];if(!te(l,o,l.parser)){M(r,h.FxEventType.error,s.cursor,i);break}M(l.steps,h.FxEventType.nodeEnd,d.cursor,[f.data[0],h.FxNodeCloseType.startTagClosed])}}}else r=le(o.xml,{lineNumber:o.lineNumber,column:o.column,offset:o.offset},o.options);W(r,o)},serializeMatch:function(e){return e.type===h.FxNodeType.element},serialize:function(t,e,r,n,o){var a="<";return t.name&&(a+=t.name),t.attrs&&t.attrs.length&&t.attrs.forEach(function(e){a+=" "+xe.serialize(e,t.attrs,r,n,o,t)}),t.closeType===h.FxNodeCloseType.selfCloseing?a+=" />":(t.closeType&&t.closeType!==h.FxNodeCloseType.fullClosed&&t.closeType!==h.FxNodeCloseType.startTagClosed||(a+=">"),t.children&&t.children.length&&(a+=n(t.children,o,t)),t.closeType&&t.closeType!==h.FxNodeCloseType.fullClosed||(a+="</"+(t.name||"")+">"),a)}},ve={nodeNature:h.FxNodeNature.alone,nodeType:h.FxNodeType.processingInstruction,parseMatch:/^<\s*\?/,attrLeftBoundaryChar:/^'|^"/,attrRightBoundaryChar:/^'|^"/,attrBoundaryCharNeedEqual:!0,allowNodeNotClose:h.FxNodeParserAllowNodeNotCloseOption.allow,checkAttrsEnd:function(e,t){return V(e,t,"?",">")},parse:function(e){W(de(e.xml,{lineNumber:e.lineNumber,column:e.column,offset:e.offset},e.options),e)},serializeMatch:function(e){return e.type===h.FxNodeType.processingInstruction},serialize:function(t,e,r,n,o){var a="<?";return t.name&&(a+=t.name),t.attrs&&t.attrs.length&&t.attrs.forEach(function(e){a+=" "+xe.serialize(e,t.attrs,r,n,o,t)}),t.closeType&&t.closeType!==h.FxNodeCloseType.fullClosed||(a+="?>"),a}},Fe={nodeNature:h.FxNodeNature.children,nodeType:h.FxNodeType.dtd,attrLeftBoundaryChar:/^'|^"|^\(/,attrRightBoundaryChar:/^'|^"|^\)/,parseMatch:/^<\s*\!|^>|^\]\s*>/,allowNodeNotClose:function(e,t,r){return e.type===h.FxNodeType.dtd&&e.parent,!0},checkAttrsEnd:function(e,t){var r=e[t.offset];if(">"===r||"["===r)return t},parse:function(e){var t=V(e.xml,K(e),"]",">");if(t){if((n=ie(e.xml,{lineNumber:e.lineNumber,column:e.column,offset:e.offset},e.options,t))[n.length-1].step!==h.FxEventType.error){var r=J(n,e,function(e){return e.type===h.FxNodeType.dtd&&e.children});if(-1===r){var n,o=n[0].cursor;M(n=[],h.FxEventType.error,o,c)}else if(0<r)for(var a=n[0],s=void 0,l=0;l<=r;l++){var u=(s=s?s.parent:e.currentNode).children?s.children[s.children.length-1].steps[s.children[s.children.length-1].steps.length-1]:s.steps[s.steps.length-1],d=s.steps[0];if(!te(s,e,s.parser)){M(n,h.FxEventType.error,a.cursor,i);break}M(s.steps,h.FxEventType.nodeEnd,u.cursor,[d.data[0],h.FxNodeCloseType.startTagClosed])}}}else n=fe(e.xml,{lineNumber:e.lineNumber,column:e.column,offset:e.offset},e.options);W(n,e)},serializeMatch:function(e){return e.type===h.FxNodeType.dtd},serialize:function(t,e,r,n,o,a){var s="<!";return t.name&&(s+=t.name),t.attrs&&t.attrs.length&&t.attrs.forEach(function(e){s+=" "+xe.serialize(e,t.attrs,r,n,o,t)}),t.children&&t.children.length?(s+="[",s+=n(t.children,o,t),t.closeType&&t.closeType!==h.FxNodeCloseType.fullClosed||(s+="]>")):t.closeType&&t.closeType!==h.FxNodeCloseType.fullClosed&&t.closeType!==h.FxNodeCloseType.startTagClosed||(s+=">"),s}},he=[Ee,ye,ve,Fe,ge];O.nodeAdapters=E(he);var Ce=(Ae.prototype._eventHandler=function(e){var t;this.events[e]&&(t=Array.from(arguments),this.events[e].forEach(function(e){e&&e.apply(null,t)}))},Ae.prototype.on=function(e,t){this.events[e]||(this.events[e]=[]),this.events[e].push(t)},Ae.prototype.parse=function(e,t){return ce(e,Object.assign({nodeAdapters:E(this.options.nodeAdapters),onEvent:this._eventHandler},this.options.parseOptions,"object"===y(t)&&t?t:{}))},Ae.prototype.parseResultToJSON=pe,Ae.prototype.serialize=function(e,t){return Te(e,Object.assign({nodeAdapters:this.options.nodeAdapters},"object"===y(t)&&t?t:{}))},Ae);function Ae(e){(e="object"===y(e)&&e?e:{}).nodeAdapters||(e.nodeAdapters=Object.create(he)),"object"===y(e.parseOptions)&&e.parseOptions?e.parseOptions=Object.assign({},O,e.parseOptions):e.parseOptions=Object.create(O),this.options=e,this.events={},this._eventHandler=this._eventHandler.bind(this)}h.ATTR_BOUNDARY_CHAR_NOT_EQUAL={code:10,message:"属性表达式中前后引号不一致"},h.ATTR_CONTENT_HAS_BR=S,h.ATTR_EQUAL_NEAR_SPACE=w,h.ATTR_HAS_MORE_EQUAL=b,h.ATTR_IS_WRONG={code:9,message:"属性表达式非法"},h.ATTR_NAME_IS_EMPTY=A,h.ATTR_NAME_IS_WRONG={code:8,message:"属性名称非法，可能含有“<”，“'”，“\"”等字符"},h.AttrParser=xe,h.BOUNDARY_HAS_SPACE=v,h.CDATAParser=ye,h.CDATA_END=f,h.CDATA_START=d,h.COMMENT_END=N,h.COMMENT_START=T,h.CommentParser=Ee,h.DEFAULT_PARSE_OPTIONS=O,h.DTD_END="]>",h.DTD_START="<!",h.DtdParser=Fe,h.END_TAG_NOT_MATCH_START=c,h.ElementParser=ge,h.FxParser=Ce,h.ProcessingInstructionParser=ve,h.REX_SPACE=P,h.TAG_HAS_MORE_BOUNDARY_CHAR=F,h.TAG_NAME_IS_EMPTY=C,h.TAG_NAME_NEAR_SPACE=p,h.TAG_NAME_NOT_EQUAL={code:11,message:"标签名称前后不一致"},h.TAG_NOT_CLOSE=i,h.TextParser=Ne,h.createFxError=_,h.createNodeByNodeStartStep=Y,h.createStep=X,h.currentIsLineBreak=j,h.equalCursor=D,h.equalSubStr=function(e,t,r){return e.substr(t,r.length)===r},h.findNodeParser=H,h.findNodeSerializer=G,h.findStartTagLevel=J,h.findStrCursor=function(e,t,r){for(var n=e.length,o=K(t);o.offset<n;R(o,0,1,1)){if(e[o.offset]===r[0]){var a=e.substr(o.offset,r.length);if(a===r){for(var s=K(o),l=0,u=a.length;l<u;l++&&R(o,0,1,1)){var d=j(e,o.offset);-1!==d&&R(o,1,-o.column,d?1:0)}return[!0,s,o]}}var f=j(e,o.offset);-1!==f&&R(o,1,-o.column,f?1:0)}return[!1,o]},h.getEndCursor=function(e,t){for(var r=e.length,n=K(t);n.offset<r;R(n,0,1,1)){var o=j(e,n.offset);-1!==o&&R(n,1,-n.column,o?1:0)}return n},h.ignoreSpaceFindCharCursor=z,h.ignoreSpaceIsHeadTail=V,h.isElementEndTagBegin=m,h.isFunc=x,h.lxWrongToJSON=L,h.moveCursor=R,h.nodeToJSON=q,h.notSpaceCharCursor=I,h.parse=ce,h.parseAloneNode=oe,h.parseResultToJSON=pe,h.pick=g,h.pushStep=M,h.repeatString=k,h.serialize=Te,h.setContextMaxCursor=U,h.setNodeLocationByCursor=Q,h.startsWith=function(e,t,r){void 0===r&&(r=0);var n=r?e.substr(r):e;if(t instanceof RegExp){var o=n.match(t);return o&&o[0]&&0===n.indexOf(o[0])}return 0===n.indexOf(t)},h.toCursor=K,h.tryParseAloneNode=ne,h.tryParseAttr=me,h.tryParseAttrs=ae,h.tryParseDtdEndTag=ie,h.tryParseDtdStartTag=fe,h.tryParseElementEndTag=ue,h.tryParseElementStartTag=le,h.tryParsePI=de,h.tryParseText=re,Object.defineProperty(h,"__esModule",{value:!0})});
