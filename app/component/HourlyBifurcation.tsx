import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { DataTable } from 'react-native-paper';
import { ckmeans, mode } from "simple-statistics";

type Data = {
    date: Date,
    open: any,
    high: any,
    close: any,
    low: any
}
interface CustomArrayObject {
    [key: string]: any; // 'any' can be replaced with a specific type like 'string', 'number', etc.
}

const HourlyBifurcation = ({ data, ochl, range }: { data: Data[]; ochl: string; range: string; }) => {
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const [threeDArray, setThreeDArray] = useState<CustomArrayObject>({});
    const [flippedArray, setFlippedArray] = useState<CustomArrayObject>({});
    const [currentInterval, setCurrentInterval] = useState(0);
    const [maxHL, setMaxHL] = useState(0);
    const getDayName = (date: Date) => dayNames[date.getDay()];
    const getTimeSlotKey = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };
    const calculateRange = (deltas: CustomArrayObject) => {
        const continousHL = deltas.map((ele: any) => ele.highLowDelta);
        const continousOC = deltas.map((ele: any) => ele.highLowDelta);
        const binsHL = ckmeans(continousHL, 10);
        const binsOC = ckmeans(continousOC, 10);
        let maxLength = 0;
        let modeBin: any[] = [];
        binsHL.forEach((bin) => {
            if (bin.length > maxLength) {
                maxLength = bin.length;
                modeBin = bin;
            }
        });
        const modHL = mode(modeBin);

        maxLength = 0;
        modeBin = [];
        binsOC.forEach((bin) => {
            if (bin.length > maxLength) {
                maxLength = bin.length;
                modeBin = bin;
            }
        });
        const modOC = mode(modeBin);
        return {
            'oc': {
                'max': Math.round(Math.max(...deltas.map((ele: { openCloseDelta: number; }) => Math.abs(ele.openCloseDelta))) * 100) / 100,
                'min': Math.round(Math.min(...deltas.map((ele: { openCloseDelta: number; }) => Math.abs(ele.openCloseDelta))) * 100) / 100,
                'avg': Math.round((deltas.reduce((acc: number, cum: { openCloseDelta: number; }) => acc + Math.abs(cum.openCloseDelta), 0) / deltas.length) * 100) / 100,
                'mod': Math.round(modOC*100)/100
            },
            'hl': {
                'max': Math.round(Math.max(...deltas.map((ele: { highLowDelta: number; }) => Math.abs(ele.highLowDelta))) * 100) / 100,
                'min': Math.round(Math.min(...deltas.map((ele: { highLowDelta: number; }) => Math.abs(ele.highLowDelta))) * 100) / 100,
                'avg': Math.round((deltas.reduce((acc: number, cum: { highLowDelta: number; }) => acc + Math.abs(cum.highLowDelta), 0) / deltas.length) * 100) / 100,
                'mod': Math.round(modHL*100)/100

            }
        };
    };
    useEffect(() => {
        const newThreeDArray: any = {};
        for (const item of data) {
            const dayName = getDayName(item.date); // Get the day name (e.g., SUN, MON, etc.)
            const timeSlotKey = getTimeSlotKey(item.date); // Get the time slot key (HH:MM)
            const openCloseDelta = item.close - item.open;
            const highLowDelta = item.high - item.low;
            const date = item.date;
            if (!newThreeDArray[dayName]) {
                newThreeDArray[dayName] = {};
            }
            if (!newThreeDArray[dayName][timeSlotKey]) {
                newThreeDArray[dayName][timeSlotKey] = [];
            }
            newThreeDArray[dayName][timeSlotKey].push({
                date,
                openCloseDelta,
                highLowDelta,
            });
        }

        setThreeDArray(newThreeDArray);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    useEffect(() => {
        const newFlippedArray: any = {};
        for (const dayName of dayNames) {
            for (const timeSlot of Object.keys(threeDArray[dayName] || {})) {
                if (!newFlippedArray[timeSlot]) {
                    newFlippedArray[timeSlot] = {};
                }
                newFlippedArray[timeSlot][dayName] = threeDArray[dayName][timeSlot];
            }
        }
        setFlippedArray(newFlippedArray);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threeDArray]);

    useEffect(() => {
        if (flippedArray && Object.keys(flippedArray).length > 0) {
            let max = 0;
            dayNames.forEach((day) => {
                Object.keys(flippedArray).sort().forEach((flip) => {
                    let tempOCHL = ochl as 'oc' | 'hl';
                    let tempRange = range as 'max' | 'min' | 'avg' | 'mod';
                    max = Math.max(max, calculateRange(threeDArray[day][flip])[tempOCHL][tempRange]);
                })
            })
            setMaxHL(max);
        }
        if (flippedArray && Object.keys(flippedArray).length > 1) {
            let first: string = Object.keys(flippedArray).sort()[0];
            let second: string = Object.keys(flippedArray).sort()[1];
            let interval: number = Number(second.split(':')[0]) * 60 + Number(second.split(':')[1]) - (Number(first.split(':')[0]) * 60 + Number(first.split(':')[1]));
            setCurrentInterval(interval);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flippedArray, ochl, range])

    function checkRowBorder(timeSlot: string) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTime = hours * 60 + minutes;
        const receivedTime = Number(timeSlot.split(':')[0]) * 60 + Number(timeSlot.split(':')[1]);
        const nextReceivedTime = receivedTime + currentInterval;
        return nextReceivedTime >= currentTime && currentTime >= receivedTime;
    }

    function checkColBorder(day: string) {
        const date = new Date();
        return day === dayNames[date.getDay()];
    }

    function classCalculator(n: number, max: number) {
        return maxHL === 0 ? 'heatmap-10' : 'heatmap_' + Math.ceil(n * 10 / max);
    }

    const printColumn = (timeSlot: any) => {
        return <>
            <DataTable.Row style={currentInterval && checkRowBorder(timeSlot) ? styles.borderedCell : ''} >
                <DataTable.Cell>
                    <View>
                        <Text style={styles.column} key={timeSlot}>{timeSlot}</Text>
                    </View>
                </DataTable.Cell>
                {dayNames.map((dayName) => {
                    if (Object.keys(threeDArray).find((ele) => ele === dayName) && Object.keys(threeDArray[dayName]).find((ele) => ele === timeSlot)) {
                        let displayValue = calculateRange(threeDArray[dayName][timeSlot]);
                        let tempOCHL = ochl as 'oc' | 'hl';
                        let tempRange = range as 'max' | 'min' | 'avg' | 'mod'
                        let tempStyle = classCalculator(displayValue[tempOCHL][tempRange], maxHL) as keyof typeof styles;
                        return (
                            <DataTable.Cell key={timeSlot + '' + dayName} style={[styles[tempStyle] as StyleProp<ViewStyle>, checkColBorder(dayName) ? styles.borderedCell : '']}>
                                <DataTable>
                                    <DataTable.Header >
                                        <DataTable.Title><View><Text key={timeSlot + '1' + dayName} style={styles.timeSlot}>{maxHL > 0 ? Math.ceil(displayValue[tempOCHL][tempRange] * 100 / maxHL) + '%' : null}</Text></View></DataTable.Title>
                                        <DataTable.Title><View><Text key={timeSlot + '2' + dayName} style={styles.timeSlot}>OC</Text></View></DataTable.Title>
                                        <DataTable.Title><View><Text key={timeSlot + '3' + dayName} style={styles.timeSlot}>HL</Text></View></DataTable.Title>
                                    </DataTable.Header>
                                    <DataTable.Row>
                                        <DataTable.Cell><View><Text key={timeSlot + '4' + dayName} style={styles.timeSlot}>MAX</Text></View></DataTable.Cell>
                                        <DataTable.Cell><View><Text key={timeSlot + '5' + dayName} style={styles.timeSlot}>{displayValue['oc']['max']}</Text></View></DataTable.Cell>
                                        <DataTable.Cell><View><Text key={timeSlot + '6' + dayName} style={styles.timeSlot}>{displayValue['hl']['max']}</Text></View></DataTable.Cell>
                                    </DataTable.Row>
                                    <DataTable.Row>
                                        <DataTable.Cell><View><Text key={timeSlot + '7' + dayName} style={styles.timeSlot}>AVG</Text></View></DataTable.Cell>
                                        <DataTable.Cell><View><Text key={timeSlot + '8' + dayName} style={styles.timeSlot}>{displayValue['oc']['avg']}</Text></View></DataTable.Cell>
                                        <DataTable.Cell><View><Text key={timeSlot + '9' + dayName} style={styles.timeSlot}>{displayValue['hl']['avg']}</Text></View></DataTable.Cell>
                                    </DataTable.Row>
                                    <DataTable.Row>
                                        <DataTable.Cell><View><Text key={timeSlot + '10' + dayName} style={styles.timeSlot}>MIN</Text></View></DataTable.Cell>
                                        <DataTable.Cell><View><Text key={timeSlot + '11' + dayName} style={styles.timeSlot}>{displayValue['oc']['min']}</Text></View></DataTable.Cell>
                                        <DataTable.Cell><View><Text key={timeSlot + '12' + dayName} style={styles.timeSlot}>{displayValue['hl']['min']}</Text></View></DataTable.Cell>
                                    </DataTable.Row>
                                    <DataTable.Row>
                                        <DataTable.Cell><View><Text key={timeSlot + '13' + dayName} style={styles.timeSlot}>MOD</Text></View></DataTable.Cell>
                                        <DataTable.Cell><View><Text key={timeSlot + '14' + dayName} style={styles.timeSlot}>{displayValue['oc']['mod']}</Text></View></DataTable.Cell>
                                        <DataTable.Cell><View><Text key={timeSlot + '15' + dayName} style={styles.timeSlot}>{displayValue['hl']['mod']}</Text></View></DataTable.Cell>
                                    </DataTable.Row>
                                </DataTable>
                            </DataTable.Cell>
                        )
                    } else {
                        return (
                            <View key={timeSlot + '' + dayName}>
                                {''}
                            </View>
                        );
                    }
                })}
            </DataTable.Row>
        </>

    }

    return (
        <View>
            {threeDArray && Object.keys(threeDArray).length > 0 && flippedArray && Object.keys(flippedArray).length > 0 &&
                <DataTable>
                    <View style={styles.container as StyleProp<ViewStyle>}>
                        <DataTable.Header style={styles.tableHeader}>
                            <DataTable.Title key={"header1"}><View><Text style={styles.tableHeaderText}>Time Slot</Text></View></DataTable.Title>
                            {dayNames.map((dayName) => (
                                <DataTable.Title key={dayName}><View><Text style={styles.tableHeaderText}>{dayName}</Text></View></DataTable.Title>
                            ))}
                        </DataTable.Header>
                        {Object.keys(flippedArray).sort().map((timeSlot) => {
                            return printColumn(timeSlot);
                        })}
                    </View>
                </DataTable>
            }
        </View >
    );
};

export default HourlyBifurcation;

const styles = StyleSheet.create({
    borderedCell: {
        borderColor: 'black',
        borderWidth: 5,
    },
    verticalScroll: {
        flex: 1
    },
    container: {
        padding: 15
    },
    tableHeader: {
        backgroundColor: '#DCDCDC',
    },
    tableHeaderText: {
        color: 'black',
        fontSize: 13,
    },
    timeSlot: {
        color: '#fff',
        fontSize: 13,
        paddingRight: 10,
        paddingLeft: 10
    },
    column: {
        color: 'black',
        fontSize: 13
    },
    heatmap_0: {
        backgroundColor: '#2E8B57'
    },
    heatmap_1: {
        backgroundColor: '#3CB371'
    },
    heatmap_2: {
        backgroundColor: '#7CFC00'
    },
    heatmap_3: {
        backgroundColor: '#9ACD32'
    },
    heatmap_4: {
        backgroundColor: '#ADFF2F'
    },
    heatmap_5: {
        backgroundColor: '#FFD700'
    },
    heatmap_6: {
        backgroundColor: '#FFA500'
    },
    heatmap_7: {
        backgroundColor: '#FF8C00'
    },
    heatmap_8: {
        backgroundColor: '#FF6347'
    },
    heatmap_9: {
        backgroundColor: '#FF4500'
    },
    heatmap_10: {
        backgroundColor: '#FF0000'
    },
});