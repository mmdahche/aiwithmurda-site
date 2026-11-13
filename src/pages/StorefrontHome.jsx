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
