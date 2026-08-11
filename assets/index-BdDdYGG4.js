(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(s){if(s.ep)return;s.ep=!0;const i=t(s);fetch(s.href,i)}})();const S=Object.freeze({DOCUMENT:"DOCUMENT",SECTION_HEADING:"SECTION_HEADING",PARAGRAPH:"PARAGRAPH",SENTENCE:"SENTENCE",CLAUSE:"CLAUSE",TOKEN:"TOKEN"}),k=Object.freeze({NOUN:"NOUN",PROPN:"PROPN",PRON:"PRON",VERB:"VERB",ADJ:"ADJ",CONN:"CONN",HEDGE:"HEDGE",MARKDOWN_SYMBOL:"MARKDOWN_SYMBOL"});class O{constructor(e,t){this.startChar=e,this.endChar=t}}class se{constructor(e,t,n,s,i,a="",r=null){this.node_id=e,this.node_type=t,this.parent_id=n,this.child_ids=[],this.slice=s,this.depth=i,this.raw_text=a,this.tag=r}}class ne{constructor(e="doc_0"){this.doc_id=e,this.nodes=[],this.root_id=0,this.total_tokens=0,this.max_depth=0}add_node(e,t,n="",s=null,i=0,a=null){const r=this.nodes.length,o=new se(r,e,s,t,i,n,a);return this.nodes.push(o),s!==null&&s>=0&&s<this.nodes.length&&this.nodes[s].child_ids.push(r),i>this.max_depth&&(this.max_depth=i),e===S.TOKEN&&(this.total_tokens+=1),o}get_node(e){return e>=0&&e<this.nodes.length?this.nodes[e]:null}get_nodes_by_type(e){return this.nodes.filter(t=>t.node_type===e)}}const D=Object.freeze({GLOBAL:"GLOBAL",PARAGRAPH:"PARAGRAPH",LOCAL_CLAUSE:"LOCAL_CLAUSE"});class ie{constructor(e,t,n,s,i=D.GLOBAL,a=!1){this.symbol_id=e,this.name=t,this.entity_type=n,this.first_appeared_node_id=s,this.referenced_node_ids=[s],this.scope=i,this.is_implicit=a}}class ae{constructor(){this.symbols={},this.unresolved_references_count=0}add_symbol(e,t,n,s=D.GLOBAL,i=!1){if(this.symbols[e])return this.symbols[e].referenced_node_ids.push(n),this.symbols[e];const a=Object.keys(this.symbols).length,r=new ie(a,e,t,n,s,i);return this.symbols[e]=r,r}}class V{constructor(e,t,n){this.text=e,this.start_char=t,this.end_char=n}}class K{constructor(e,t,n,s,i,a,r){this.text=e,this.start_char=t,this.end_char=n,this.is_heading=s,this.is_list_item=i,this.heading_level=a,this.sentences=r}}class re{constructor(e,t,n){this.raw_text=e,this.normalized_text=t,this.paragraphs=n}}class oe{constructor(e="auto"){this.language=e}normalizeText(e){let t=e.replace(/\r\n/g,`
`).replace(/\r/g,`
`);return typeof t.normalize=="function"&&(t=t.normalize("NFKC")),t}process(e){const t=this.normalizeText(e),n=this._splitParagraphs(t);return new re(e,t,n)}_splitParagraphs(e){const t=[],n=e.split(`
`);let s=[],i=0;for(let a=0;a<n.length;a++){const r=n[a],o=r.length,u=i,p=i+o;i=p+1;const d=r.trim();if(!d){if(s.length>0){const m=this._createParagraphBlock(s,e);m&&t.push(m),s=[]}continue}const l=d.match(/^(#{1,6})\s+(.*)$/),c=d.match(/^(?:[-*+・]|\d+\.)\s+(.*)$/);if(l||c){if(s.length>0){const _=this._createParagraphBlock(s,e);_&&t.push(_),s=[]}const m=l?l[1].length:0,v=!!l,b=!!c,N=this._splitSentences(d,u);t.push(new K(d,u,p,v,b,m,N))}else s.push([r,u,p])}if(s.length>0){const a=this._createParagraphBlock(s,e);a&&t.push(a)}return t}_createParagraphBlock(e,t){const n=e.map(r=>r[0]).join(`
`),s=e[0][1],i=e[e.length-1][2],a=this._splitSentences(n,s);return new K(n,s,i,!1,!1,0,a)}_splitSentences(e,t){const n=[];if(!e)return n;const s=/([^。！？.!?]+[。！？.!?]+['”」』\)]*|[^。！？.!?]+$)/g;let i,a=0;for(;(i=s.exec(e))!==null;){const r=i[0].trim();if(r){const o=t+i.index,u=t+i.index+i[0].length;n.push(new V(r,o,u))}if(s.lastIndex===a)break;a=s.lastIndex}return n.length===0&&n.push(new V(e,t,t+e.length)),n}}const R=32,ce=["と思われる","と考えられる","一説には","一般的には","と言えるでしょう","〜と考えられる","〜と思われる","推測される","見込まれる","it is generally believed","it seems that","arguably","may be considered","could be argued","it is worth noting","presumably"],le=["私","僕","俺","当方","自分","筆者","我々","\\bI\\b","\\bwe\\b","\\bmy\\b","\\bour\\b","\\bme\\b","\\bus\\b"],de=["しかし","また","さらに","その結果","一方で","したがって","ただし","そして","ゆえに","そのため","なお","加えるに","\\bhowever\\b","\\btherefore\\b","\\bmoreover\\b","\\bfurthermore\\b","\\bnevertheless\\b","\\bnonetheless\\b","\\bconversely\\b","\\badditionally\\b"],he=["```[a-zA-Z0-9_-]*","\\*\\*","`","^#{1,6}\\s","^---+$","^>\\s"];class ue{constructor(e="auto"){this.preprocessor=new oe(e),this._hedgeRe=new RegExp(ce.join("|"),"i"),this._firstPersonRe=new RegExp(le.join("|"),"i"),this._connRe=new RegExp(de.join("|"),"i"),this._markdownRe=new RegExp(he.join("|"),"i")}parse(e,t="doc_0"){const n=this.preprocessor.process(e),s=new ne(t),i=s.add_node(S.DOCUMENT,new O(0,n.normalized_text.length),n.normalized_text,null,0);for(let a=0;a<n.paragraphs.length;a++)this._parseParagraph(s,i.node_id,n.paragraphs[a]);return s}_parseParagraph(e,t,n){let s=e.nodes[t].depth+1;s>=R&&(s=R);const i=n.is_heading?S.SECTION_HEADING:S.PARAGRAPH,a=e.add_node(i,new O(n.start_char,n.end_char),n.text,t,s);for(let r=0;r<n.sentences.length;r++)this._parseSentence(e,a.node_id,n.sentences[r])}_parseSentence(e,t,n){let s=e.nodes[t].depth+1;s>=R&&(s=R);const i=e.add_node(S.SENTENCE,new O(n.start_char,n.end_char),n.text,t,s),a=this._splitClauses(n.text,n.start_char);for(let r=0;r<a.length;r++){const[o,u,p]=a[r];this._parseClause(e,i.node_id,o,u,p)}}_parseClause(e,t,n,s,i){let a=e.nodes[t].depth+1;a>=R&&(a=R);const r=e.add_node(S.CLAUSE,new O(s,i),n,t,a),o=this._tokenize(n,s),u=Math.min(a+1,R);for(let p=0;p<o.length;p++){const[d,l,c,m]=o[p];e.add_node(S.TOKEN,new O(c,m),d,r.node_id,u,l)}}_splitClauses(e,t){const n=/([^、,;]+[、,;]?)/g,s=[];let i;for(;(i=n.exec(e))!==null;){const a=i[0].trim();a&&s.push([a,t+i.index,t+i.index+i[0].length])}return s.length>0?s:[[e,t,t+e.length]]}_tokenize(e,t){const n=[],s=/(\S+)/g;let i;for(;(i=s.exec(e))!==null;){const a=i[0],r=t+i.index,o=t+i.index+a.length,u=this._determineTokenTag(a);n.push([a,u,r,o])}return n}_determineTokenTag(e){return this._markdownRe.test(e)?k.MARKDOWN_SYMBOL:this._hedgeRe.test(e)?k.HEDGE:this._firstPersonRe.test(e)?k.PRON:this._connRe.test(e)?k.CONN:null}}const pe=["私","僕","俺","当方","自分","筆者","我々","わし","小生","(?<![A-Za-z0-9_/.-])I(?![A-Za-z0-9_/.-])","(?<![A-Za-z0-9_/.-])we(?![A-Za-z0-9_/.-])","(?<![A-Za-z0-9_/.-])my(?![A-Za-z0-9_/.-])","(?<![A-Za-z0-9_/.-])our(?![A-Za-z0-9_/.-])","(?<![A-Za-z0-9_/.-])me(?![A-Za-z0-9_/.-])","(?<![A-Za-z0-9_/.-])us(?![A-Za-z0-9_/.-])"],_e=["これ","それ","あれ","この","その","あの","同氏","同社","同省","前述","前文","\\bthis\\b","\\bthat\\b","\\bthese\\b","\\bthose\\b","\\bit\\b","\\bthey\\b"],me=["[A-Z][a-zA-Z0-9_-]+","[ァ-ンヴー]{2,}","(?:開発|チーム|コミュニケーション|処理|メリット|機能|システム|設定|コンテナ|コード|技術|概要|記事|背景|課題|問題|対応|結果|提案|導入)"];class ge{constructor(){this._firstPersonRes=pe.map(e=>new RegExp(e,"gi")),this._properNounRes=me.map(e=>new RegExp(e,"g")),this._demonstrativeRes=_e.map(e=>new RegExp(e,"gi"))}get name(){return"SymbolPass"}execute(e,t){const n=e.get_nodes_by_type(S.PARAGRAPH),s=new Set;for(let o=0;o<n.length;o++){const u=n[o],p=u.raw_text;for(const d of this._firstPersonRes){const l=p.match(d);if(l){const c=l[0];t.add_symbol(c,"FIRST_PERSON",u.node_id,D.GLOBAL,!1),s.add(c)}}for(const d of this._properNounRes){const l=p.match(d);if(l)for(const c of l)["I","we","my","our","me","us","I/O"].includes(c)||(t.add_symbol(c,"PROPN",u.node_id,D.GLOBAL,!1),s.add(c))}for(const d of this._demonstrativeRes){const l=p.match(d);if(l){const c=l[0],m=s.size===0;t.add_symbol(c,"DEMONSTRATIVE",u.node_id,D.PARAGRAPH,m),m&&(t.unresolved_references_count+=1)}}}const i=Object.keys(t.symbols).length,a=Object.values(t.symbols).filter(o=>o.entity_type==="FIRST_PERSON").length,r=i>0?t.unresolved_references_count/i:0;return{total_symbols:i,first_person_count:a,unresolved_references_count:t.unresolved_references_count,implicit_ratio:Number(r.toFixed(4))}}}class fe{constructor(){this._markdownRe=/```[a-zA-Z]*|\*\*.*?\*\*|^---+$|###?\s/gm,this._emDashRe=/―|—|--/g,this._puncRe=/[。！？.!?]/g}get name(){return"SurfacePass"}execute(e,t){const n=e.get_node(e.root_id);if(!n||!n.raw_text)return{markdown_anomaly_score:0,punctuation_uniformity:0,em_dash_density:0};const s=n.raw_text,i=Math.max(s.length,1),r=(s.match(this._markdownRe)||[]).reduce((v,b)=>v+b.length,0),o=Math.min(r/i*20,1),p=(s.match(this._emDashRe)||[]).length/i*1e3,d=[];let l;const c=new RegExp(this._puncRe.source,"g");for(;(l=c.exec(s))!==null;)d.push(l.index);let m=.5;if(d.length>=3){const v=[];for(let x=1;x<d.length;x++)v.push(d[x]-d[x-1]);const b=v.reduce((x,h)=>x+h,0)/v.length,N=v.reduce((x,h)=>x+Math.pow(h-b,2),0)/v.length,_=Math.sqrt(N),g=b>0?_/b:0;m=Math.max(0,Math.min(1,1-g))}return{markdown_anomaly_score:Number(o.toFixed(4)),punctuation_uniformity:Number(m.toFixed(4)),em_dash_density:Number(p.toFixed(4))}}}const be=["徹底解説","以下のポイントに留意","まとめとして","をはじめとする","多角的な視点から","重要な役割を果たし","詳しく見ていきましょう","背景には.*?挙げられます","注目を集めています","本記事では","一概には言えませんが","不可欠な要素","実践的な","注力することが推奨されます","環境を整備することが重要","ご参考になりましたら幸いです","お気軽にお知らせください","以下のメリット","を享受","是非.*?ご検討ください","結論から言うと","結局のところ","これからの時代","大切になってくる","コメントで教えて","\\bin conclusion\\b","\\bit is worth noting\\b","\\bdelve into\\b","\\bplays a crucial role\\b","\\btestament to\\b","\\btapestry of\\b","\\bin today's fast-paced world\\b"],ye=["と思われる","と考えられる","一説には","一般的には","と言えるでしょう","推測される","見込まれる","可能性が高い","\\bit is generally believed\\b","\\bit seems that\\b","\\barguably\\b","\\bmay be considered\\b","\\bcould be argued\\b"];class xe{constructor(){this._aiPhraseRes=be.map(e=>new RegExp(e,"gi")),this._hedgeRes=ye.map(e=>new RegExp(e,"gi"))}get name(){return"LexicalPass"}execute(e,t){const n=e.get_node(e.root_id);if(!n||!n.raw_text)return{ai_phrase_density:0,ngram_entropy:0,hedge_expression_ratio:0};const s=n.raw_text,i=Math.max(s.length,1);let a=0;for(const c of this._aiPhraseRes){const m=s.match(c);m&&(a+=m.length)}const r=a/i*1e3;let o=0;for(const c of this._hedgeRes){const m=s.match(c);m&&(o+=m.length)}const u=e.get_nodes_by_type(S.SENTENCE),p=Math.max(u.length,1),d=Math.min(o/p,1),l=this._calculateNgramEntropy(s,2);return{ai_phrase_density:Number(r.toFixed(4)),ngram_entropy:Number(l.toFixed(4)),hedge_expression_ratio:Number(d.toFixed(4))}}_calculateNgramEntropy(e,t=2){const n=e.replace(/\s+/g,"");if(n.length<t)return 0;const s={},i=n.length-t+1;for(let r=0;r<i;r++){const o=n.slice(r,r+t);s[o]=(s[o]||0)+1}let a=0;for(const r of Object.values(s)){const o=r/i;a-=o*Math.log2(o)}return a}}class ve{get name(){return"StructuralPass"}execute(e,t){if(!e.nodes||e.nodes.length===0)return{depth_variance:0,sentence_length_cv:0,paragraph_length_cv:0,node_type_entropy:0,heading_density:0,list_density:0};const n=e.get_node(e.root_id),s=Math.max(n&&n.raw_text?n.raw_text.length:1,1),a=e.nodes.filter(h=>h.node_type!==S.TOKEN).map(h=>h.depth);let r=0;if(a.length>0){const h=a.reduce((w,I)=>w+I,0)/a.length;r=a.reduce((w,I)=>w+Math.pow(I-h,2),0)/a.length}const u=e.get_nodes_by_type(S.SENTENCE).map(h=>h.raw_text.trim().length).filter(h=>h>0),p=this._calculateCv(u),d=e.get_nodes_by_type(S.PARAGRAPH),l=d.map(h=>h.raw_text.trim().length).filter(h=>h>0),c=this._calculateCv(l),m={};for(const h of e.nodes)m[h.node_type]=(m[h.node_type]||0)+1;const v=e.nodes.length;let b=0;for(const h of Object.values(m)){const w=h/v;b-=w*Math.log2(w)}const _=e.get_nodes_by_type(S.SECTION_HEADING).length/s*1e3;let g=0;for(const h of d){const w=h.raw_text.replace(/^\s+/,"");/^(?:[-*+・]|\d+\.)/.test(w)&&g++}const x=g/s*1e3;return{depth_variance:Number(r.toFixed(4)),sentence_length_cv:Number(p.toFixed(4)),paragraph_length_cv:Number(c.toFixed(4)),node_type_entropy:Number(b.toFixed(4)),heading_density:Number(_.toFixed(4)),list_density:Number(x.toFixed(4))}}_calculateCv(e){if(!e||e.length===0)return 0;const t=e.reduce((i,a)=>i+a,0)/e.length;if(t===0)return 0;const n=e.reduce((i,a)=>i+Math.pow(a-t,2),0)/e.length;return Math.sqrt(n)/t}}const we=["余談だが","ちなみに","話は変わるが","ところで","それはさておき","脱線するが","蛇足だが","補足だが","寄り道","あ[、,]そういえば","話が変わるが","ふと思ったのだが","\\bby the way\\b","\\bincidentally\\b","\\bas a side note\\b","\\bdigressing\\b","\\bon another note\\b"],Se=["いや[、,]","正確には","言い換えると","というか","むしろ","というよりは?","補足すると","訂正すると","前言を撤回すると","違った[、,]","失礼[、,]","正しくは","撤回","\\bor rather\\b","\\bto be precise\\b","\\bmore accurately\\b","\\bthat is to say\\b","\\bin other words\\b","\\bcorrection:\\b","\\brather,\\b","\\bI mean\\b"],Ee=["(?:私|僕|俺|自分|筆者|我々)\\b.*?(?:体験|経験|試した|やってみた|感じた|と思った|と考えた|に気づいた|でハマった|失敗した|成功した|困った|驚いた|試作した|無駄にした|叫んでしまった|感動|寄り道|痛感|買ってみた|聴いてみた|落胆した|思い立って|遭遇した)","(?:体験|経験|試した|やってみた|感じた|と思った|と考えた|に気づいた|でハマった|失敗した|成功した|困った|驚いた|試作した|無駄にした|叫んでしまった|感動|寄り道|痛感|買ってみた|聴いてみた|落胆した|遭遇した).*?(?:私|僕|俺|自分|筆者|我々)\\b","(?:私|僕|俺|自分|筆者|我々)\\b.*?(?:の体験|の経験|の印象|の考え|の失敗)","(?<![A-Za-z0-9_/.-])I\\b.*?(?:tested|tried|built|noticed|realized|experienced|encountered|found|felt|thought|struggled)","\\bwhen I\\b","\\bin my experience\\b","\\bI noticed\\b","\\bI tested\\b","\\bI built\\b","\\bI tried\\b","\\bI realized\\b"],Ne=new Set(["こと","もの","ため","よう","これ","それ","あれ","これら","それら","です","ます","ある","いる","する","なる","できる","について","the","a","an","and","or","but","in","on","at","to","for","of","with","is","are"]);class Te{constructor(){this._digressionRes=we.map(e=>new RegExp(e,"gi")),this._selfCorrectionRes=Se.map(e=>new RegExp(e,"gi")),this._firstPersonRes=Ee.map(e=>new RegExp(e,"gi"))}get name(){return"FlowPass"}execute(e,t){const n=e.get_node(e.root_id);if(!n||!n.raw_text)return{topic_jump_density:0,self_correction_count:0,emphasis_imbalance_entropy:0,first_person_experience_density:0};const s=n.raw_text,i=Math.max(s.length,1);let a=0;for(const _ of this._digressionRes){const g=s.match(_);g&&(a+=g.length)}const r=e.get_nodes_by_type(S.PARAGRAPH);let o=a;const u=e.get_nodes_by_type(S.SECTION_HEADING).map(_=>_.node_id);for(let _=0;_<r.length-1;_++){const g=r[_],x=r[_+1],h=g.raw_text.trim(),w=x.raw_text.trim();if(!(g.node_type===S.SECTION_HEADING||x.node_type===S.SECTION_HEADING||/^(?:[-*+・]|\d+\.|#|---)/.test(h)||/^(?:[-*+・]|\d+\.|#|---)/.test(w)||w.includes("幸いです")||w.includes("お知らせください")||u.some(T=>g.node_id<T&&T<x.node_id))&&h.length>=25&&w.length>=25){const T=this._extractKeywords(h),L=this._extractKeywords(w);if(T.size>0&&L.size>0){const H=new Set([...T].filter(F=>L.has(F))),P=new Set([...T,...L]);(P.size>0?H.size/P.size:1)<.04&&o++}}}const p=Number((o/i*1e3).toFixed(4)),d=s.replace(/「.*?」|".*?"/g,"");let l=0;for(const _ of this._selfCorrectionRes){const g=d.match(_);g&&(l+=g.length)}const c=r.map(_=>_.raw_text.trim().length).filter(_=>_>0),m=this._calculateEmphasisImbalance(c);let v=0;for(const _ of this._firstPersonRes){const g=s.match(_);g&&(v+=g.length)}const b=Object.values(t.symbols).filter(_=>_.entity_type==="FIRST_PERSON"&&!["I","we","me","my","our","us"].includes(_.name));v===0&&b.length>0&&(v=b.length);const N=Number((v/i*1e3).toFixed(4));return{topic_jump_density:p,self_correction_count:l,emphasis_imbalance_entropy:Number(m.toFixed(4)),first_person_experience_density:N}}_extractKeywords(e){const t=e.match(/[一-龠A-Za-z0-9_-]{2,}|[ァ-ンヴー]{2,}/g)||[],n=new Set;for(let s=0;s<t.length;s++){const i=t[s].toLowerCase();Ne.has(i)||n.add(i)}return n}_calculateEmphasisImbalance(e){if(!e||e.length<=1)return 0;const t=e.reduce((l,c)=>l+c,0);if(t===0)return 0;const n=e.length,s=e.filter(l=>l>0).map(l=>l/t);if(s.length===0)return 0;const i=-s.reduce((l,c)=>l+c*Math.log2(c),0),a=Math.log2(n),r=a>0?1-i/a:0,o=t/n,u=e.reduce((l,c)=>l+Math.pow(c-o,2),0)/n,p=Math.sqrt(u),d=o>0?p/o:0;return Math.min(1,r*1.5+d*.4)}}const Ae=100,X={technical_doc:{domain:"technical_doc",bias_term:-.35,correction_factor:.85,expected_structural_weight_modifier:.4,description:"仕様書・技術設計書。意図的な構造化を許容し偽陽性を抑止。"},technical:{domain:"technical",bias_term:-.35,correction_factor:.85,expected_structural_weight_modifier:.4,description:"技術ドキュメント。"},spec:{domain:"spec",bias_term:-.35,correction_factor:.85,expected_structural_weight_modifier:.4,description:"仕様書。"},academic_paper:{domain:"academic_paper",bias_term:-.4,correction_factor:.9,expected_structural_weight_modifier:.3,description:"学術論文。文法の厳密性と受動態定型文を考慮。"},report:{domain:"report",bias_term:-.15,correction_factor:.6,expected_structural_weight_modifier:.65,description:"業務・調査レポート。中程度の構造化を考慮。"},blog:{domain:"blog",bias_term:0,correction_factor:.4,expected_structural_weight_modifier:.8,description:"技術・個人ブログ。一定の口語と個人の経験談を期待。"},essay:{domain:"essay",bias_term:.1,correction_factor:.2,expected_structural_weight_modifier:1,description:"散文・雑記・エッセイ。ゆらぎの欠如を強力にペナルティ判定。"},general:{domain:"general",bias_term:0,correction_factor:.5,expected_structural_weight_modifier:.8,description:"一般散文・汎用ドメイン。"}};class Ce{constructor(e=null,t=null){this.parser=new ue,this.passes=e||[new ge,new fe,new xe,new ve,new Te],this.domainBaselines=t||X}analyzeText(e,t="general",n="doc_0"){const i=(e||"").trim().length;if(i<Ae)return{doc_id:n,overall_score:0,classification:"HUMAN_FLUCTUATION_STRONG",confidence:"INSUFFICIENT_LENGTH",layer_scores:{},evidence_explanations:["テキスト長が最小閾値（100文字）未満のため判定を自動スキップしました。"],domain_applied:t};let a="HIGH";i<150?a="LOW":i<200&&(a="MEDIUM");const r=this.parser.parse(e,n),o=new ae,u={};for(let y=0;y<this.passes.length;y++){const M=this.passes[y];u[M.name]=M.execute(r,o)}const p=u.SurfacePass||{},d=u.LexicalPass||{},l=u.StructuralPass||{},c=u.FlowPass||{},m=/```[a-zA-Z]*/.test(e),v=/ご参考になりましたら幸いです|お気軽にお知らせください/.test(e);let b=(p.markdown_anomaly_score||0)*40+(p.punctuation_uniformity||0)*40+Math.min((p.em_dash_density||0)*20,20);m?b=Math.max(b,90):v&&(b=Math.max(b,85)),b=Math.min(100,b);let N=Math.min(100,Math.min((d.ai_phrase_density||0)*12,75)+(d.hedge_expression_ratio||0)*40+Math.max(0,(5.5-(d.ngram_entropy||0))*12));(d.ai_phrase_density||0)>5&&(N=Math.min(100,N+((d.ai_phrase_density||0)-5)*3));const _=r.get_nodes_by_type(S.PARAGRAPH).filter(y=>y.raw_text.trim()&&!y.raw_text.trim().startsWith("---")),g=_.map(y=>y.raw_text.trim().length);let x=.5;if(g.length>0){const y=g.reduce((A,C)=>A+C,0)/g.length,M=Math.sqrt(g.reduce((A,C)=>A+Math.pow(C-y,2),0)/g.length),z=y>0?M/y:0;x=Math.max(0,1-z)}const h=_.filter(y=>/^(?:[-*+・]|\d+\.)/.test(y.raw_text.replace(/^\s+/,""))).map(y=>y.raw_text.replace(/^\s*/,"").replace(/^[-*+123456789.・\s]+/,"").trim().length);let w=.5;if(h.length>=2){const y=h.reduce((A,C)=>A+C,0)/h.length,M=Math.sqrt(h.reduce((A,C)=>A+Math.pow(C-y,2),0)/h.length),z=y>0?M/y:0;w=Math.max(0,1-z)}const I=Math.max(0,1-(l.sentence_length_cv||0)),T=Math.max(0,Math.min(1,1-(l.depth_variance||0)/5)),L=Math.min(100,I*25+x*25+w*20+T*15+Math.min((l.heading_density||0)*3,7.5)+Math.min((l.list_density||0)*3,7.5)),H=Math.min(100,(c.topic_jump_density||0)*20+(c.self_correction_count||0)*35+(c.emphasis_imbalance_entropy||0)*25+(c.first_person_experience_density||0)*25+o.unresolved_references_count*15),P=Math.max(0,Math.min(100,100-H)),U={surface:Number(b.toFixed(2)),lexical:Number(N.toFixed(2)),structural:Number(L.toFixed(2)),flow:Number(P.toFixed(2))},F=this.domainBaselines[t]||this.domainBaselines.general||X.general,J=F.expected_structural_weight_modifier,q=F.bias_term,$=.15,j=.35,W=.2*J,Z=.3,Y=$+j+W+Z,Q=q<-.2?18:10,ee=q*Q,te=(b*$+N*j+L*W+P*Z)/Y,G=Number(Math.max(0,Math.min(100,te+ee)).toFixed(2));let B="HUMAN_FLUCTUATION_STRONG";G>=70?B="AI_HOMOGENEOUS_HIGH":G>=30.1&&(B="MIXED_NEEDS_REVIEW");const E=[];return m?E.push("コードブロック枠（```markdown）の消し忘れアーティファクトが検出されました"):(p.markdown_anomaly_score||0)>.1&&E.push(`Markdownプロンプト残留/過剰強調が検出されました (異常スコア: ${(p.markdown_anomaly_score||0).toFixed(2)})`),(d.ai_phrase_density||0)>2&&E.push(`AI頻出定型句の密度が高頻度です (密度: ${(d.ai_phrase_density||0).toFixed(2)}/1000文字)`),(d.hedge_expression_ratio||0)>.3&&E.push(`責任回避・抽象ヘッジ表現が多用されています (比率: ${(d.hedge_expression_ratio||0).toFixed(2)})`),(l.sentence_length_cv||0)<.2&&E.push(`文長の均一性が極めて高く、人間特有の長短ゆらぎが乏しいです (CV: ${(l.sentence_length_cv||0).toFixed(2)})`),x>.7&&E.push(`段落長および構造の分散が著しく低下しており、整然と均一化されています (均一性: ${x.toFixed(2)})`),h.length>=2&&w>.7&&E.push("箇条書き項目の文字数が極めて均一に設計されています"),(c.self_correction_count||0)>0&&E.push(`人間特有の思考の自己訂正・軌道修正の痕跡が検出されました (${c.self_correction_count}件)`),(c.topic_jump_density||0)>1&&E.push(`話題の脱線・思考のジャンプが検出されました (密度: ${(c.topic_jump_density||0).toFixed(2)}/1000文字)`),(c.first_person_experience_density||0)>1&&E.push(`一人称および具体体験表現が含まれています (密度: ${(c.first_person_experience_density||0).toFixed(2)}/1000文字)`),o.unresolved_references_count>0&&E.push(`人間文章特有の暗黙的・未解決参照が検出されました (${o.unresolved_references_count}件)`),P>=70&&(c.self_correction_count||0)===0&&(c.first_person_experience_density||0)===0&&E.push("脱線・自己訂正・一人称体験が欠如しており、AI特有の均質で機械的な文章フローです"),["technical_doc","technical","spec","academic_paper","report"].includes(t)&&E.push(`ドメイン補正 (${t}) を適用し、仕様書・報告書等の構造化に伴うスコアを最適補正しました`),E.length===0&&E.push("特記すべきAI均質シグナルは検出されませんでした。"),{doc_id:n,overall_score:G,classification:B,confidence:a,layer_scores:U,evidence_explanations:E,domain_applied:t}}}class Re{constructor(e,t){this.container=e,this.onDomainChange=t,this.render()}render(){this.container.innerHTML=`
      <header class="app-header">
        <div class="header-content">
          <div class="brand-section">
            <div class="brand-logo">🐾</div>
            <div class="brand-text">
              <h1>
                Tanuki Context Checker
                <span class="badge-edition">SeaCafe Edition</span>
              </h1>
              <p>生成AI文章チェッカー — 思考のゆらぎ・均質化検出システム</p>
            </div>
          </div>
          <div class="domain-selector-wrapper">
            <label for="domainSelect">🌐 適用ドメイン:</label>
            <select id="domainSelect" class="domain-select">
              <option value="general">一般散文 (general)</option>
              <option value="technical_doc">仕様書・技術設計書 (technical_doc)</option>
              <option value="blog">技術・個人ブログ (blog)</option>
              <option value="essay">散文・雑記・エッセイ (essay)</option>
              <option value="report">業務・調査レポート (report)</option>
              <option value="academic_paper">学術論文 (academic_paper)</option>
            </select>
          </div>
        </div>
      </header>
    `,this.container.querySelector("#domainSelect").addEventListener("change",t=>{typeof this.onDomainChange=="function"&&this.onDomainChange(t.target.value)})}setDomain(e){const t=this.container.querySelector("#domainSelect");t&&(t.value=e)}}const Ie={essay:{domain:"essay",title:"人間エッセイ (ゆらぎ強)",text:`昨日の夜、ふと思い立って昔買った古い真空管アンプの電源を入れてみた。
最初はジーというハムノイズしか聞こえなくて、「ああ、またコンデンサが飛んだか…」と落胆したのだが、10分ほど放置していたら突然、昔聴き込んだビル・エヴァンスのピアノが実に温かみのある音で響き始めたのだった。
いや、正確にはエヴァンスではなくマイルス・デイヴィスの『Kind of Blue』だったかもしれない。とにかく、その瞬間の部屋の空気の変化には妙に感動してしまった。

デジタルオーディオの利便性には勝てないし、サブスクで数百万曲が聴ける時代にわざわざ暖機運転が必要な機械を使うなんて効率の極みから遠く離れている。だけど、こういう無駄な時間とか、予期せぬノイズの混入こそが、私にとっては音楽を聴く体験そのものなのだと思う。
最近の仕事でも同じことを感じる。すべてを効率化し、AIで最適化されたコードを書くのは確かに気持ちいい。だが、ふとしたバグ調査の途中で脱線してオープンソースのソースコードを読みふけってしまう、あの寄り道にこそエンジニアとしての面白さが詰まっているのではないだろうか。`},ai_blog:{domain:"blog",title:"AI生成ブログ (均質化高)",text:`## Pythonにおける非同期処理（asyncio）の基本概念と活用法

近年、Webアプリケーションの高性能化やマイクロサービス化に伴い、非同期処理の重要性が高まっています。Pythonでは \`asyncio\` ライブラリを使用することで、シングルスレッドでありながら効率的なI/O多重化を実現することが可能です。

### 非同期処理の主なメリット
非同期処理を導入することにより、以下のメリットを享受することができます。

1. **レスポンスタイムの向上**: I/O待ち時間中に他のタスクを実行できるため、全体処理時間を短縮できます。
2. **リソース消費の削減**: スレッドを大量に生成する必要がないため、メモリ使用量を抑えられます。
3. **スケーラビリティの確保**: C10K問題に対処し、多数の同時接続をスムーズに処理可能です。

### まとめ
本記事では、Pythonの \`asyncio\` の基本概念と利点について解説しました。適切なユースケースで非同期処理を活用することにより、システムのパフォーマンスを極大化させることができるでしょう。是非プロジェクトへの導入をご検討ください。`},spec:{domain:"technical_doc",title:"技術仕様書 (ドメイン補正対象)",text:`# システム間同期API インターフェース仕様書

## 概要
本仕様書は、基幹基盤システムと店舗端末（ParticipationManager）との間で顧客滞在データをリアルタイム同期するためのRESTful API仕様を定義する。

## エンドポイント定義
POST /api/v1/sync/stay-events

### リクエストヘッダー
- Content-Type: application/json
- Authorization: Bearer <JWT_TOKEN>
- X-Client-ID: string (必須)

### ペイロード仕様
リクエストボディは以下のフィールドを含むJSONオブジェクトでなければならない。
1. \`device_id\` (string, 必須): 店舗端末の識別ID。
2. \`timestamp\` (integer, 必須): Unixエポックミリ秒。
3. \`events\` (array, 必須): イベントオブジェクトの配列。

## エラーハンドリング方針
認証エラーが発生した場合は HTTP 401 Unauthorized を返却する。バリデーションエラーの場合は HTTP 400 Bad Request を返し、レスポンスボディの \`details\` 配列に詳細コードを格納すること。`},short:{domain:"blog",title:"短文サンプル (<100文字)",text:"AI文章チェッカーのテスト短文です。これは短すぎるテキストの挙動を検証するためのサンプルです。"}};class Le{constructor(e,{onInputText:t,onSelectSample:n}){this.container=e,this.onInputText=t,this.onSelectSample=n,this.debounceTimer=null,this.render()}render(){this.container.innerHTML=`
      <div class="glass-panel text-input-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span>📝 解析テキスト入力</span>
          </div>
          <div class="sample-buttons-group">
            <button class="sample-btn" data-sample="essay">☕ 人間エッセイ</button>
            <button class="sample-btn" data-sample="ai_blog">🤖 AI生成ブログ</button>
            <button class="sample-btn" data-sample="spec">📑 技術仕様書</button>
            <button class="sample-btn" data-sample="short">⚡ 短文テスト</button>
          </div>
        </div>

        <div class="textarea-wrapper">
          <textarea
            id="analysisTextarea"
            class="input-textarea"
            placeholder="解析したいテキスト（文章・記事・レポート等）を入力してください... (300msリアルタイム解析対応)"
          ></textarea>
        </div>

        <div class="textarea-footer">
          <div class="char-counter" id="charCounter">0 文字</div>
          <div class="status-indicator" id="statusIndicator">入力待ち</div>
        </div>

        <div class="panel-actions">
          <button class="btn-secondary" id="clearBtn">🗑 クリア</button>
          <button class="btn-primary" id="analyzeBtn">🔍 今すぐ解析実行</button>
        </div>
      </div>
    `,this.textarea=this.container.querySelector("#analysisTextarea"),this.charCounter=this.container.querySelector("#charCounter"),this.statusIndicator=this.container.querySelector("#statusIndicator"),this.clearBtn=this.container.querySelector("#clearBtn"),this.analyzeBtn=this.container.querySelector("#analyzeBtn"),this.textarea.addEventListener("input",()=>{this.updateCharCounter(),this.triggerDebouncedInput()}),this.clearBtn.addEventListener("click",()=>{this.textarea.value="",this.updateCharCounter(),typeof this.onInputText=="function"&&this.onInputText("")}),this.analyzeBtn.addEventListener("click",()=>{typeof this.onInputText=="function"&&this.onInputText(this.textarea.value)}),this.container.querySelectorAll(".sample-btn").forEach(t=>{t.addEventListener("click",()=>{const n=t.getAttribute("data-sample"),s=Ie[n];s&&(this.textarea.value=s.text,this.updateCharCounter(),typeof this.onSelectSample=="function"&&this.onSelectSample(s))})})}updateCharCounter(){const e=this.textarea.value.trim().length;this.charCounter.textContent=`${e} 文字`,e===0?(this.charCounter.className="char-counter",this.statusIndicator.textContent="入力待ち"):e<100?(this.charCounter.className="char-counter warning",this.statusIndicator.textContent="⚠️ 100文字未満（信頼度制限あり）"):(this.charCounter.className="char-counter valid",this.statusIndicator.textContent="✅ 解析可能")}triggerDebouncedInput(){this.debounceTimer&&clearTimeout(this.debounceTimer),this.debounceTimer=setTimeout(()=>{typeof this.onInputText=="function"&&this.onInputText(this.textarea.value)},300)}setText(e){this.textarea.value=e,this.updateCharCounter()}getText(){return this.textarea.value}}class Pe{constructor(e){this.container=e,this.render()}render(){this.container.innerHTML=`
      <div class="glass-panel score-gauge-panel">
        <div class="score-label">総合 AI 均質化判定スコア</div>
        <div class="gauge-svg-container">
          <svg class="gauge-svg" viewBox="0 0 200 120">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#2a9d8f" />
                <stop offset="50%" stop-color="#e9c46a" />
                <stop offset="100%" stop-color="#e76f51" />
              </linearGradient>
            </defs>
            <!-- Background Arc Track -->
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              stroke-width="14"
              stroke-linecap="round"
            />
            <!-- Animated Value Arc -->
            <path
              id="gaugeArc"
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#gaugeGradient)"
              stroke-width="14"
              stroke-linecap="round"
              stroke-dasharray="251.32"
              stroke-dashoffset="251.32"
              style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);"
            />
          </svg>
        </div>
        <div class="score-display-value" id="scoreVal">0.0</div>
        <div id="classificationBadge" class="classification-badge badge-human">
          <span>未解析</span>
        </div>
        <div id="confidenceIndicator" class="confidence-indicator">信頼度: HIGH</div>
      </div>
    `,this.gaugeArc=this.container.querySelector("#gaugeArc"),this.scoreVal=this.container.querySelector("#scoreVal"),this.classificationBadge=this.container.querySelector("#classificationBadge"),this.confidenceIndicator=this.container.querySelector("#confidenceIndicator")}update(e){if(!e){this.scoreVal.textContent="0.0",this.classificationBadge.className="classification-badge badge-human",this.classificationBadge.innerHTML="<span>未解析</span>",this.confidenceIndicator.textContent="信頼度: --",this.setGaugeOffset(0);return}const t=e.overall_score||0;this.scoreVal.textContent=t.toFixed(1);const n=251.32,s=Math.max(0,Math.min(100,t)),i=n-n*s/100;this.setGaugeOffset(i);let a="badge-human",r="🍃 人間らしいゆらぎ強 (人間執筆)";e.classification==="AI_HOMOGENEOUS_HIGH"?(a="badge-ai",r="🤖 AI生成の可能性高 (均質化・ゆらぎ欠如)"):e.classification==="MIXED_NEEDS_REVIEW"?(a="badge-mixed",r="⚖️ 混在・要確認 (共同編集/要レビュー)"):e.confidence==="INSUFFICIENT_LENGTH"&&(a="badge-human",r="⚠️ 100文字未満 (判定不可)"),this.classificationBadge.className=`classification-badge ${a}`,this.classificationBadge.innerHTML=`<span>${r}</span>`;const o={HIGH:"HIGH (高信頼度)",MEDIUM:"MEDIUM (中信頼度)",LOW:"LOW (低信頼度)",INSUFFICIENT_LENGTH:"INSUFFICIENT_LENGTH (100文字未満)"};this.confidenceIndicator.textContent=`判定信頼度: ${o[e.confidence]||e.confidence}`}setGaugeOffset(e){this.gaugeArc&&(this.gaugeArc.style.strokeDashoffset=e)}}class Me{constructor(e){this.container=e,this.render()}render(){this.container.innerHTML=`
      <div class="glass-panel layer-breakdown-card">
        <h3>
          <span>📊 4層別スコアブレイクダウン</span>
          <span style="font-size:0.75rem; font-weight:normal; color:var(--seacafe-white-dim);">100点満点（高いほどAI均質化傾向）</span>
        </h3>
        <div class="layer-list">
          <!-- Surface Layer -->
          <div class="layer-item">
            <div class="layer-header">
              <span class="layer-name">✨ 表層記号 (Surface)</span>
              <span class="layer-score-val" id="scoreSurface">0.0</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar bar-surface" id="barSurface" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Lexical Layer -->
          <div class="layer-item">
            <div class="layer-header">
              <span class="layer-name">📚 語彙・表現密度 (Lexical)</span>
              <span class="layer-score-val" id="scoreLexical">0.0</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar bar-lexical" id="barLexical" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Structural Layer -->
          <div class="layer-item">
            <div class="layer-header">
              <span class="layer-name">🏛 構造統計・均一性 (Structural)</span>
              <span class="layer-score-val" id="scoreStructural">0.0</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar bar-structural" id="barStructural" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Flow Layer -->
          <div class="layer-item">
            <div class="layer-header">
              <span class="layer-name">🌊 ゆらぎフロー・思考痕跡 (Flow)</span>
              <span class="layer-score-val" id="scoreFlow">0.0</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar bar-flow" id="barFlow" style="width: 0%;"></div>
            </div>
          </div>
        </div>
      </div>
    `,this.scoreSurface=this.container.querySelector("#scoreSurface"),this.barSurface=this.container.querySelector("#barSurface"),this.scoreLexical=this.container.querySelector("#scoreLexical"),this.barLexical=this.container.querySelector("#barLexical"),this.scoreStructural=this.container.querySelector("#scoreStructural"),this.barStructural=this.container.querySelector("#barStructural"),this.scoreFlow=this.container.querySelector("#scoreFlow"),this.barFlow=this.container.querySelector("#barFlow")}update(e){if(!e||!e.layer_scores){this.setLayer("Surface",0),this.setLayer("Lexical",0),this.setLayer("Structural",0),this.setLayer("Flow",0);return}const t=e.layer_scores;this.setLayer("Surface",t.surface||0),this.setLayer("Lexical",t.lexical||0),this.setLayer("Structural",t.structural||0),this.setLayer("Flow",t.flow||0)}setLayer(e,t){const n=t.toFixed(1),s=Math.max(0,Math.min(100,t));this[`score${e}`]&&(this[`score${e}`].textContent=n),this[`bar${e}`]&&(this[`bar${e}`].style.width=`${s}%`)}}class Oe{constructor(e){this.container=e,this.render()}render(){this.container.innerHTML=`
      <div class="glass-panel evidence-card">
        <h3>🔍 主要な検出根拠・説明 (Explainability)</h3>
        <ul class="evidence-list" id="evidenceList">
          <li class="evidence-item">解析結果がここに表示されます...</li>
        </ul>
      </div>
    `,this.evidenceList=this.container.querySelector("#evidenceList")}update(e){if(!e||!e.evidence_explanations||e.evidence_explanations.length===0){this.evidenceList.innerHTML=`
        <li class="evidence-item">（解析対象のテキストを入力してください）</li>
      `;return}const t=e.evidence_explanations.map(n=>{let s="📌",i="evidence-item";return n.includes("ドメイン補正")?(s="⚖️",i+=" domain-note"):n.includes("検出")||n.includes("消し忘れ")||n.includes("高頻度")||n.includes("均一")||n.includes("欠如")?(s="🚨",i+=" ai-signal"):(n.includes("思考の自己訂正")||n.includes("一人称")||n.includes("脱線")||n.includes("暗黙"))&&(s="🌱",i+=" human-signal"),`<li class="${i}"><span>${s} ${this.escapeHtml(n)}</span></li>`});this.evidenceList.innerHTML=t.join("")}escapeHtml(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}}class De{constructor(){this.domain="general",this.text="",this.report=null,this.checker=new Ce,this.worker=null,this.initWorker(),this.initUI()}initWorker(){try{this.worker=new Worker(new URL(""+new URL("worker-BHIaz_VD.js",import.meta.url).href,import.meta.url),{type:"module"}),this.worker.onmessage=e=>{const{status:t,report:n,error:s}=e.data||{};t==="success"&&n?(this.report=n,this.updateDashboard()):s&&(console.error("Worker Analysis Error:",s),this.runDirectAnalysis())}}catch(e){console.warn("Web Worker not supported or failed to initialize. Falling back to direct thread execution.",e),this.worker=null}}initUI(){const e=document.getElementById("headerContainer");this.header=new Re(e,a=>{this.domain=a,this.runAnalysis()});const t=document.getElementById("inputPanelContainer");this.inputPanel=new Le(t,{onInputText:a=>{this.text=a,this.runAnalysis()},onSelectSample:a=>{this.text=a.text,a.domain&&(this.domain=a.domain,this.header.setDomain(this.domain)),this.runAnalysis()}});const n=document.getElementById("scoreGaugeContainer");this.scoreGauge=new Pe(n);const s=document.getElementById("layerBreakdownContainer");this.layerBreakdown=new Me(s);const i=document.getElementById("evidenceListContainer");this.evidenceList=new Oe(i),this.updateDashboard()}runAnalysis(){if(!this.text||this.text.trim().length===0){this.report=null,this.updateDashboard();return}this.worker?this.worker.postMessage({text:this.text,domain:this.domain,docId:`doc_${Date.now()}`}):this.runDirectAnalysis()}runDirectAnalysis(){try{this.report=this.checker.analyzeText(this.text,this.domain,`doc_${Date.now()}`)}catch(e){console.error("Direct Analysis Error:",e),this.report=null}this.updateDashboard()}updateDashboard(){this.scoreGauge.update(this.report),this.layerBreakdown.update(this.report),this.evidenceList.update(this.report)}}document.addEventListener("DOMContentLoaded",()=>{window.tanukiApp=new De});
//# sourceMappingURL=index-BdDdYGG4.js.map
