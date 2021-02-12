import {Component, Input, OnInit} from '@angular/core';
import {buildSearchBox, SearchBox, SearchBoxOptions} from '@coveo/headless';
import {FormControl} from '@angular/forms';
import {engine} from '../engine';

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss'],
})
export class SearchBoxComponent implements OnInit {
  headlessSearchBox: SearchBox;
  myControl = new FormControl();
  suggestions: {
    highlightedValue: string;
    rawValue: string;
  }[];

  constructor() {}

  updateState() {
    this.suggestions = this.headlessSearchBox.state.suggestions;
  }

  onSelect(value: string) {
    this.headlessSearchBox.selectSuggestion(value);
  }

  onInput() {
    this.headlessSearchBox.updateText(this.myControl.value);
  }

  search() {
    this.headlessSearchBox.submit();
    this.headlessSearchBox.hideSuggestions();
  }

  private initializeController() {
    const options: SearchBoxOptions = {
      numberOfSuggestions: 3,
    };

    this.headlessSearchBox = buildSearchBox(engine, {
      options,
    });
  }

  ngOnInit() {
    this.initializeController();
    this.headlessSearchBox.subscribe(() => this.updateState());
  }
}