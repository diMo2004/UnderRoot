import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#1A2F23', '#B48E4D', '#2D4D3A', '#8D734A', '#4A6152'];

const ChartComponent = ({ node, updateAttributes }: any) => {
  const { type, data, title } = node.attrs;
  const [isEditing, setIsEditing] = useState(false);
  const [dataInput, setDataInput] = useState(JSON.stringify(data, null, 2));

  const handleSave = () => {
    try {
      const parsed = JSON.parse(dataInput);
      updateAttributes({ data: parsed });
      setIsEditing(false);
    } catch (e) {
      alert("Invalid JSON data format");
    }
  };

  const renderChart = () => {
    if (type === 'pie') {
      return (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#B48E4D" label>
            {data.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      );
    }

    if (type === 'line') {
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#B48E4D" strokeWidth={2} dot={{ r: 4, fill: '#1A2F23' }} />
        </LineChart>
      );
    }

    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: 'rgba(180,142,77,0.05)' }} />
        <Bar dataKey="value" fill="#B48E4D" radius={[4, 4, 0, 0]} />
      </BarChart>
    );
  };

  return (
    <NodeViewWrapper className="chart-node">
      <div style={{
        margin: '20px 0', padding: '24px', background: '#fff',
        border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1A2F23' }}>
            {title}
          </h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              style={{ padding: '4px 10px', fontSize: 10, background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
            >
              {isEditing ? 'Cancel' : 'Edit Data'}
            </button>
            <select 
              value={type} 
              onChange={(e) => updateAttributes({ type: e.target.value })}
              style={{ fontSize: 10, padding: '4px', borderRadius: 4, border: '1px solid #ddd' }}
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
            </select>
          </div>
        </div>

        {isEditing ? (
          <div style={{ animation: 'fadeIn 0.2s' }}>
            <textarea 
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              style={{
                width: '100%', height: '150px', padding: '12px', borderRadius: 6,
                border: '1px solid #ddd', fontFamily: 'monospace', fontSize: 11,
                marginBottom: 12, outline: 'none'
              }}
            />
            <button 
              onClick={handleSave}
              style={{ width: '100%', padding: '10px', background: '#1A2F23', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              Update Visualization
            </button>
          </div>
        ) : (
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const Chart = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      type: { default: 'bar' },
      title: { default: 'Research Data Visualization' },
      data: {
        default: [
          { name: 'Group A', value: 400 },
          { name: 'Group B', value: 300 },
          { name: 'Group C', value: 500 },
          { name: 'Group D', value: 200 },
        ]
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="chart"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chart' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartComponent)
  },
});
