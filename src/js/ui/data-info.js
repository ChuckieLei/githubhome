/* eslint-disable camelcase */
import { createElement } from '../utils/utils.js';
import { AppProps } from '../core/app-props.js';
import { POPUP_TYPES } from '../core/constants.js';

// Custom relative time webcomponent. Uncomment for development only.
// import '@github/time-elements'

export default class DataInfo {
  constructor(props) {
    this.props = props;
    this.init();
    this.now = new Date();
    this.cardHeader = '';
    this.units = {
      day:    24 * 60 * 60 * 1000,
      hour:   60 * 60 * 1000,
      minute: 60 * 1000,
      second: 1000
    }
    this.cardOffset = {x: 10, y: 16};
  }

  init() {
    const parentNode = document.querySelector(this.props.parentSelector || 'body');
    const { basePath, imagePath } = AppProps;

    this.isVisible = false;
    this.element = createElement(
      'div',
      ['data-info', 'position-absolute', 'top-0', 'left-0', 'rounded', 'text-mono', 'f6', 'py-3', 'pl-2', 'pr-5', 'z-3', 'js-globe-popup', 'text-white', 'd-none'],
      `
      <a class='js-globe-popover-card no-underline d-flex flex-row flex-items-start'>

        <div class='pr-2 pt-1 pl-2'>
          <img src='${basePath}${imagePath}pull-request-icon.svg' aria-hidden='true' class='js-globe-popup-icon-pr' loading='lazy'>
          <img src='${basePath}${imagePath}north-star.svg' aria-hidden='true' class='js-globe-popup-icon-acv mt-n1 d-none' width='24' loading='lazy'>
        </div>

        <div>
          <div class='f4 color-text-white js-globe-popover-header'>#34234 facebook/react</div>
          <div style='color: #959da5' class='js-globe-popover-body'></div>
        </div>

      </a>
    `
    );
    this.element.style.maxWidth = '450px';
    this.element.style.backgroundColor = 'rgba(0,0,0, 0.4)';
    this.element.style.backdropFilter = 'blur(10px)';
    this.element.style.webkitBackdropFilter = 'blur(10px)';
    parentNode.appendChild(this.element);

    this.card = this.element.querySelector('.js-globe-popover-card');
    this.header = this.card.querySelector('.js-globe-popover-header');
    this.body = this.card.querySelector('.js-globe-popover-body');
  }

  update(mouseScreenPos, offset) {
    const targetX = mouseScreenPos.x + offset.x + this.cardOffset.x;
    const targetY = mouseScreenPos.y + offset.y + this.cardOffset.y;
    const cardRect = this.element.getBoundingClientRect();
    const newX = Math.min(targetX, window.innerWidth - cardRect.width - this.cardOffset.x);
    const bottomEdge = targetY + cardRect.height;
    const aboveCursor = mouseScreenPos.y - cardRect.height - this.cardOffset.y/2 + offset.y;
    const newY = bottomEdge > window.innerHeight + offset.y ? aboveCursor : targetY;
    this.element.style.transform = `translate(${newX}px, ${newY}px)`;
  }

  setInfo(info) {
    const { user_opened_location, user_merged_location, language, type, header, body, name_with_owner, pr_id, time, url } = info;
    const prHeader = `#${pr_id} ${name_with_owner}`;
    if (this.cardHeader == prHeader || this.cardHeader == header) return;
    this.cardHeader = prHeader;

    const timeStamp = this.shouldShowTime(time) ? this.relativeTime(time) : '';
    
    if (url !== null) this.card.href = url;

    if (type === POPUP_TYPES.PR_MERGED) {
      this.header.textContent = prHeader;
      this.body.textContent = '';
      this.body.insertAdjacentHTML('beforeend', `Opened in ${user_opened_location},\nmerged ${timeStamp} in ${user_merged_location}`);
      if (language !== null) this.body.prepend(language, this.colorDotForLanguage(language));
      this.showPRIcon();
    } else if (type === POPUP_TYPES.PR_OPENED) {
      this.header.textContent = prHeader;
      this.body.textContent = '';
      this.body.insertAdjacentHTML('beforeend', `Opened ${timeStamp} in ${user_opened_location}`);
      if (language !== null) this.body.prepend(language, this.colorDotForLanguage(language));
      this.showPRIcon();
    } else if (type === POPUP_TYPES.CUSTOM) {
      this.header.textContent = header;
      this.body.innerText = body;
      this.showGHIcon();
    }
  }

  relativeTime(time) {
    // Custom relative time webcomponent from @github/time-elements
    const isoTimeString = new Date(time).toISOString();
    return `<time-ago datetime="${isoTimeString}">${isoTimeString}</time-ago>`;
  }

  shouldShowTime(time) { return time !== null && this.now - time < this.units.day }

  showPRIcon() {
    document.querySelector('.js-globe-popup-icon-pr').classList.remove('d-none');
    document.querySelector('.js-globe-popup-icon-acv').classList.add('d-none');
  }

  showGHIcon() {
    document.querySelector('.js-globe-popup-icon-pr').classList.add('d-none');
    document.querySelector('.js-globe-popup-icon-acv').classList.remove('d-none');
  }

  show() {
    if (this.isVisible == true) return;
    const { domElement, controls } = this.props;
    domElement.classList.add('cursor-pointer');
    this.element.classList.remove('d-none');
    this.element.classList.add('d-block');

    controls.autoRotationSpeedScalarTarget = 0;
    this.isVisible = true;
  }

  hide() {
    if (this.isVisible == false) return;
    const { domElement, controls } = this.props;
    domElement.classList.remove('cursor-pointer');
    this.element.classList.remove('d-block');
    this.element.classList.add('d-none');
    controls.autoRotationSpeedScalarTarget = 1;
    this.isVisible = false;
  }

  dispose() {
    if (this.element && this.element.parentNode) {
      document.body.removeChild(this.element);
    }

    this.element = null;
    this.props = null;
    this.icon = null;
    this.dataElement = null;
    this.openedLocationElement = null;
    this.mergedLocationElement = null;
    this.languageElement = null;
  }

  colorDotForLanguage(language) {
    const languageDot = document.createElement("span");
    languageDot.style.color = this.colorForLanguage(language);
    languageDot.textContent = " • ";
    return languageDot;
  }

  //为语言设置样式
  colorForLanguage(language) {
    const colors = {
      "ActionScript": "#882B0F",
      "AMPL": "#E6EFBB",
      "API Blueprint": "#2ACCA8",
      "Apollo Guidance Computer": "#0B3D91",
      "AppleScript": "#101F1F",
      "Arc": "#aa2afe",
      "ASP.NET": "#9400ff",
      "Assembly": "#6E4C13",
      "Batchfile": "#C1F12E",
      "C": "#555555",
      "C#": "#178600",
      "C++": "#f34b7d",
      "Clojure": "#db5855",
      "CoffeeScript": "#244776",
      "ColdFusion": "#ed2cd6",
      "ColdFusion CFC": "#ed2cd6",
      "Common Lisp": "#3fb68b",
      "Component Pascal": "#B0CE4E",
      "Crystal": "#000100",
      "CSON": "#244776",
      "CSS": "#563d7c",
      "Dart": "#00B4AB",
      "Dockerfile": "#384d54",
      "EJS": "#a91e50",
      "Elixir": "#6e4a7e",
      "Elm": "#60B5CC",
      "Emacs Lisp": "#c065db",
      "EmberScript": "#FFF4F3",
      "EQ": "#a78649",
      "Erlang": "#B83998",
      "Game Maker Language": "#71b417",
      "GAML": "#FFC766",
      "Glyph": "#c1ac7f",
      "Go": "#00ADD8",
      "GraphQL": "#e10098",
      "Haml": "#ece2a9",
      "Handlebars": "#f7931e",
      "Harbour": "#0e60e3",
      "Haskell": "#5e5086",
      "HTML": "#e34c26",
      "J": "#9EEDFF",
      "Java": "#b07219",
      "JavaScript": "#f1e05a",
      "Julia": "#a270ba",
      "Kotlin": "#F18E33",
      "Less": "#1d365d",
      "Lex": "#DBCA00",
      "LLVM": "#185619",
      "Lua": "#000080",
      "Makefile": "#427819",
      "Markdown": "#083fa1",
      "MATLAB": "#e16737",
      "Mercury": "#ff2b2b",
      "Metal": "#8f14e9",
      "Nim": "#ffc200",
      "Nix": "#7e7eff",
      "NumPy": "#9C8AF9",
      "Objective-C": "#438eff",
      "Objective-C++": "#6866fb",
      "Pan": "#cc0000",
      "Pascal": "#E3F171",
      "Pawn": "#dbb284",
      "Perl": "#0298c3",
      "PHP": "#4F5D95",
      "PLSQL": "#dad8d8",
      "PostScript": "#da291c",
      "PowerBuilder": "#8f0f8d",
      "PowerShell": "#012456",
      "Prisma": "#0c344b",
      "Processing": "#0096D8",
      "Puppet": "#302B6D",
      "Python": "#3572A5",
      "R": "#198CE7",
      "Reason": "#ff5847",
      "Ruby": "#701516",
      "Rust": "#dea584",
      "Sass": "#a53b70",
      "Scala": "#c22d40",
      "Scheme": "#1e4aec",
      "SCSS": "#c6538c",
      "Shell": "#89e051",
      "Svelte": "#ff3e00",
      "SVG": "#ff9900",
      "Swift": "#ffac45",
      "TI Program": "#A0AA87",
      "Turing": "#cf142b",
      "Twig": "#c1d026",
      "TypeScript": "#2b7489",
      "Uno": "#9933cc",
      "UnrealScript": "#a54c4d",
      "Vala": "#fbe5cd",
      "Vim script": "#199f4b",
      "Visual Basic .NET": "#945db7",
      "Vue": "#41586f",
      "wdl": "#42f1f4",
      "WebAssembly": "#04133b",
      "YAML": "#cb171e"
    }

    return colors[language];
  }
}
