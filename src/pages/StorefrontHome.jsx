import React from "react";
import { ArrowRight, Code2, FolderOpen } from "lucide-react";
import { SamplerBand, StoreFaq } from "../components/storefront/StorefrontParts.jsx";
import { StoreCatalog } from "../components/storefront/StoreCatalog.jsx";

export function StorefrontHome() {
  return <main className="sf-page" id="main-content">
    <section className="sf-hero sf-shop-hero">
      <img className="sf-hero-portrait" src="/images/murad.jpg" alt="Murad Dahche, the builder behind AI with Murda" width="1080" height="1080" fetchPriority="high" />
      <div className="sf-container sf-hero-content"><span className="sf-hero-intro"><Code2 size={19} /> Scripts. Skills. Project folders.</span><h1>AI with <span>Murda.</span></h1><p>Practical downloads for building with Claude Code and Codex, from a business owner who uses them.</p><a className="sf-button" href="#browse">Find your next tool <ArrowRight size={19} /></a><p className="sf-hero-caption">I'm Murad. I started with inventory software.<br />Now I share the tools and habits behind the builds.</p></div>
    </section>
    <div className="sf-tool-strip"><div className="sf-container"><span><FolderOpen size={18} /> Download it. Make it yours.</span><span>Claude Code + Codex</span><span>Self-paced. Your own projects.</span></div></div>
    <StoreCatalog featured />
    <section className="sf-container sf-story"><div className="sf-story-title"><span>Meet the person behind the files</span><h2>I started with a store.<br />Then I started building.</h2></div><div><p>I wanted better ways to manage inventory. That led me into building business software with AI, and then into point of sale: the missing piece that connects the work.</p><p>Along the way, I built up scripts, project folders, and repeatable workflows. This is where I share the useful parts, so you can put them to work on your own ideas.</p><a className="sf-text-link" href="/about">More about Murad <ArrowRight size={18} /></a></div></section>
    <SamplerBand /><StoreFaq />
  </main>;
}

export function AboutMurad() {
  return <main className="sf-page" id="main-content"><section className="sf-container sf-about"><div><a className="sf-text-link" href="/">AI with Murda <ArrowRight size={18} /></a><h1>I'm Murad.<br />I build around<br />real problems.</h1><p>I run a retail business. My interest in AI started with something practical: making inventory easier to manage.</p><p>The deeper I got into inventory software, the clearer it became that point of sale needed to be part of the picture. That's the kind of work I use Claude Code and Codex for: breaking down a business problem, building a small piece, and checking it.</p><p>The downloads here package those working habits into instructions, scripts, and project setups you can adapt. They're tools to help you do the work, not a promise that AI will run a business for you.</p><a className="sf-button" href="/store">See what I've packaged <ArrowRight size={18} /></a></div><figure><img src="/images/murad.jpg" alt="Murad Dahche" width="1080" height="1080" /><figcaption>Murad Dahche / AI with Murda</figcaption></figure></section><section className="sf-container sf-story"><h2>Build at your own pace.</h2><div><p>I started sharing my work through a 60-day streaming challenge. Life didn't follow the schedule. The work, and the useful things that came out of it, still matter.</p><p>This site is the home for those tools. You don't need to stream, build in public, or follow my schedule to use them.</p><div className="sf-actions"><a className="sf-text-link" href="/60">The original build log <ArrowRight size={17} /></a><a className="sf-text-link" href="https://www.youtube.com/channel/UC9iGjtlA3R4vopdNLTGbnuw">YouTube <ArrowRight size={17} /></a><a className="sf-text-link" href="https://www.instagram.com/aiwithmurda/">Instagram <ArrowRight size={17} /></a></div></div></section><SamplerBand /></main>;
}
