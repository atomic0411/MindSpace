import { AIProvider } from './AIProvider.js';

export class MockProvider extends AIProvider {
  async chat({ message, mode }) {
    const labels = {
      Talk: 'I am here with you',
      Reflect: 'It may help to look gently at',
      Unwind: 'Let us slow things down',
      Reframe: 'One alternative way to notice this',
      'Journal Companion': 'As you review what you wrote'
    };
    return `${labels[mode] || labels.Talk}: what feels most present as you say, "${message.slice(0, 180)}"? You do not need to solve everything in this moment.`;
  }
}
