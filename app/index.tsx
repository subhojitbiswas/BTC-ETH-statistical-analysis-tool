import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import DropDown from './component/DropDown';
import HourlyBifurcation from './component/HourlyBifurcation';

export default function Index() {

  const [chartData, setChartData] = useState([]);
  const [ochl, setOCHL] = useState('hl');
  const [range, setRange] = useState('max');
  const [tick, setTick] = useState('1h');
  const [instr, setInstr] = useState('BTCUSD');

  function calculate12H(response: any[]) {
    let result: { date: any; open: any; close: any; high: number; low: number; }[] = [];
    response.forEach((ele, ind) => {
      if (ele.date.getHours() === 5 || ele.date.getHours() === 17) {
        let first = ele;
        let second = ind === response.length - 1 ? null : response[ind + 1];
        if (second !== null) {
          result.push({ 'date': first.date, 'open': first.open, 'close': second.close, 'high': Math.max(first.high, second.high), 'low': Math.min(first.low, second.low) });
        } else {
          result.push(first);
        }
      }
    })
    return result;
  }


  useEffect(() => {
    const params = {
      resolution: tick === '12h' ? '6h' : tick,
      symbol: instr,
      start: Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000).toString(),
      end: Math.floor(new Date().getTime() / 1000).toString()
    };
    const queryParams = new URLSearchParams(params).toString();
    const baseURL = 'https://api.india.delta.exchange/v2/history/candles';
    const url = `${baseURL}?${queryParams}`;
    fetch(url)
      .then((data) => data.json())
      .then((response) => {
        let data = response.result.map((value: any) => {
          return {
            date: new Date(value.time * 1000),
            open: value.open,
            close: value.close,
            high: value.high,
            low: value.low
          };
        }).sort((a: { date: number; }, b: { date: number; }) => a.date - b.date);
        if (tick === '12h') {
          data = calculate12H(data);
        }
        setChartData(data);
      })
  }, [instr, tick]);


  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.dropdown}>
          <DropDown
            onChange={(e) => setInstr(e.value)}
            data={[{ label: 'BTC', value: 'BTCUSD' }, { label: 'ETH', value: 'ETHUSD' }]}
            placeholder={instr}
          />
          <DropDown
            onChange={(e) => setOCHL(e.value)}
            data={[{ label: 'oc', value: 'oc' }, { label: 'hl', value: 'hl' }]}
            placeholder={ochl}
          />
          <DropDown
            onChange={(e) => setRange(e.value)}
            data={[{ label: 'max', value: 'max' }, { label: 'avg', value: 'avg' }, { label: 'min', value: 'min' }, { label: 'med', value: 'med' }]}
            placeholder={range}
          />
          <DropDown
            onChange={(e) => setTick(e.value)}
            data={[
              { label: '15m', value: '15m' },
              { label: '30m', value: '30m' },
              { label: '1h', value: '1h' },
              { label: '2h', value: '2h' },
              { label: '4h', value: '4h' },
              { label: '6h', value: '6h' },
              { label: '12h', value: '12h' },
              { label: '1d', value: '1d' },
            ]}
            placeholder={tick}
          />
        </View>
        <View>
          <ScrollView>
            <ScrollView horizontal>
              <View style={styles.hourlyBifurcation}>
                <HourlyBifurcation data={chartData} ochl={ochl} range={range} />
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  }, dropdown: {
    flex: 1,
    flexDirection: 'column'
  }, hourlyBifurcation: {
    flex: 1
  }
});
